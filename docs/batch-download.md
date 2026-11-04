# 在课程活动中批量下载已允许下载的附件

这个方法适用于自己有权访问、文件详情接口允许下载的课程活动。它逐个检查附件的 `allow_download`，对返回 `true` 的文件请求下载链接；不抓取全站内容。活动附件列表和单个文件详情中的权限字段有时不同，脚本以文件详情为准，详情不是 `true` 时跳过。

在一次 WebVPN 课程活动中，这个方法成功保存过 PDF 和 PPTX。浏览器环境及学校平台配置可能不同，脚本发起请求不代表文件已经下载完成。不要在公共场合分享链接、Cookie 或令牌。

## 操作步骤

### 怎样找到活动 ID？

1. 登录教学平台，打开目标课程的**章节**或课程内容列表。
2. 点击包含目标附件的活动，例如“课件资料”，进入能看到附件列表的活动详情页。
3. 点击浏览器地址栏。常见电脑端地址中，活动 ID 是 `learning-activity#/` 后面的数字。例如：

   ```text
   https://教学平台地址/course/12345/learning-activity#/67890
                               └课程 ID┘                    └活动 ID┘
   ```

   此例中课程 ID 是 `12345`，**活动 ID 是 `67890`**。请使用自己页面实际显示的数字，而不是这个示例。通过 WebVPN 登录时，域名前后可能多出一段路径；仍然查看 `learning-activity#/` 后面的数字。
4. 移动站点的资料活动也可能显示为 `/course/12345/material/67890/info`，其中 `material/` 与 `/info` 之间的 `67890` 是活动 ID。确认页面上确实列出了附件；如果地址格式不同，请先确认实际 ID，不要把课程 ID 当成活动 ID。

例如活动 ID 是 `67890`，就在代码中填写 `67890`；活动 ID 不等于附件列表中每个文件的 `id`（文件 ID）。

### 方案一：每次手动下载一个（适合连续弹窗或下载冲突）

该方案先收集指定活动中允许下载的文件，在页面右上角显示面板。每次点击一个文件下载，确认保存完成后再进入下一个。面板不会自动判断下载是否成功。用户在移动站点课程中确认过逐个下载可用；不同站点和浏览器的表现可能不同。

1. 按上面的方法记下要下载的一个或多个**资料活动 ID**。脚本只处理你列出的活动，不会自动发现整门课程。只填写有权访问的活动，活动 ID 与文件 ID 不同。
2. **WebVPN 电脑端**：打开包含附件的活动详情页；**移动站点**：在新标签页打开 `https://lms.ahmu.edu.cn/api/activities/活动ID`，将 `活动ID` 换成实际数字。请在此 LMS 标签页运行代码，不能在 `mobile.ahmu.edu.cn` 页面运行：移动页面的相同路径可能返回 HTML 而非 JSON。
3. 打开 Console：Mac 按 `Command + Option + I`；Windows/Linux 按 `F12` 或 `Ctrl + Shift + I`，点击 **Console（控制台）**，再点击底部输入区。Chrome 若阻止粘贴，先仔细阅读并理解代码与浏览器提示，再按提示操作。
4. 把下面代码第一行数组中的 `67890` 替换成实际活动 ID；多个 ID 用英文逗号分隔，例如 `[67890, 67891]`。完整粘贴并按 Enter，等待页面右上角出现面板。示例 ID 并不代表真实活动。
5. 点击**“点击下载这个文件”**，按浏览器提示保存；完成后回到面板点击**“下一个”**。使用 `Command + J`（Windows/Linux：`Ctrl + J`）检查下载状态、数量和文件是否能打开。关闭或刷新页面会移除面板；重新运行会从头开始，可能导致重复下载。
6. 访问被拒、登录失效、获取链接失败或权限不允许时，查看控制台和面板提示；不要公开包含临时令牌的链接，也不要绕过平台明确的下载限制。

```javascript
(async () => {
  // 替换成你要下载的资料活动 ID，可填写多个，用英文逗号分隔
  const activityIds = [67890];
  // WebVPN 活动详情页保留代理前缀；LMS 接口页面使用根路径
  const base = location.pathname.includes('/course/')
    ? location.pathname.split('/course/')[0]
    : '';
  const files = [];
  const errors = [];
  const seenFiles = new Set();

  for (const activityId of activityIds) {
    try {
      const activityResponse = await fetch(`${base}/api/activities/${activityId}`);
      if (!activityResponse.ok) {
        throw new Error(`读取活动失败：${activityResponse.status}`);
      }
      const activity = await activityResponse.json();
      for (const item of activity.uploads || []) {
        if (seenFiles.has(item.id)) continue;
        seenFiles.add(item.id);
        const detailResponse = await fetch(`${base}/api/uploads/${item.id}`);
        if (!detailResponse.ok) {
          errors.push(`${item.name}：读取文件详情失败`);
          continue;
        }
        const detail = await detailResponse.json();
        if (detail.allow_download === true) {
          files.push({id: item.id, name: item.name, activity: activity.title});
        } else {
          errors.push(`${item.name}：文件详情未允许下载，已跳过`);
        }
      }
    } catch (error) {
      errors.push(`活动 ${activityId}：${error.message}`);
    }
  }

  if (errors.length) console.table(errors);
  if (!files.length) {
    console.log('没有找到允许下载的文件。');
    return;
  }

  document.querySelector('#course-download-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'course-download-panel';
  panel.style.cssText = `
    position: fixed; z-index: 999999; top: 20px; right: 20px;
    width: 360px; padding: 20px; background: white; color: #222;
    border: 1px solid #ccc; border-radius: 10px;
    box-shadow: 0 4px 20px #0003; font: 15px/1.5 sans-serif;
  `;
  const title = document.createElement('strong');
  const filename = document.createElement('p');
  const status = document.createElement('p');
  const downloadLink = document.createElement('a');
  const nextButton = document.createElement('button');
  const closeButton = document.createElement('button');

  downloadLink.textContent = '点击下载这个文件';
  downloadLink.target = '_blank';
  downloadLink.rel = 'noopener';
  downloadLink.style.cssText = `
    display: inline-block; margin: 8px 10px 8px 0; padding: 8px 12px;
    color: white; background: #1769d2; border-radius: 5px; text-decoration: none;
  `;
  nextButton.textContent = '下一个';
  nextButton.style.cssText = 'padding: 8px 12px; margin-right: 8px;';
  closeButton.textContent = '关闭';
  closeButton.style.cssText = 'padding: 8px 12px;';
  closeButton.onclick = () => panel.remove();
  panel.append(title, filename, status, downloadLink, nextButton, closeButton);
  document.body.appendChild(panel);

  let index = 0;
  async function prepareFile() {
    const file = files[index];
    title.textContent = `文件 ${index + 1} / ${files.length}`;
    filename.textContent = `${file.activity}：${file.name}`;
    status.textContent = '正在获取下载地址……';
    downloadLink.removeAttribute('href');
    downloadLink.style.pointerEvents = 'none';
    downloadLink.style.opacity = '0.5';
    nextButton.disabled = true;
    try {
      const response = await fetch(`${base}/api/uploads/${file.id}/url`);
      if (!response.ok) throw new Error(`获取链接失败：${response.status}`);
      const {url} = await response.json();
      if (!url) throw new Error('接口没有返回下载链接');
      downloadLink.href = url;
      downloadLink.download = file.name;
      downloadLink.style.pointerEvents = 'auto';
      downloadLink.style.opacity = '1';
      status.textContent = '点击下载，完成后再点“下一个”。';
    } catch (error) {
      status.textContent = error.message;
    }
    nextButton.disabled = false;
    nextButton.textContent = index === files.length - 1 ? '完成' : '下一个';
  }
  nextButton.onclick = () => {
    if (index === files.length - 1) {
      status.textContent = '已到最后一个文件，请在 Chrome 下载记录中核对。';
      return;
    }
    index += 1;
    prepareFile();
  };
  await prepareFile();
})();
```

### 方案二：连续请求下载当前活动的附件

1. 按上面的方法进入附件所在的活动详情页，记下活动 ID。
2. 打开开发者工具：Mac 按 `Command + Option + I`；Windows/Linux 按 `F12` 或 `Ctrl + Shift + I`。
3. 在工具顶部点击 **Console（控制台）**，点击下方带 `>` 的输入区域。Chrome 如果阻止粘贴代码，先仔细阅读并理解代码及浏览器警告；确认后按提示启用粘贴。不要运行来源不明的代码。
4. 复制下方完整代码到输入区，把第一行的 `67890` 改为自己的活动 ID，按 Enter。只处理当前活动中 PDF、PPT 或 PPTX 附件。
5. 如果 Chrome 询问是否允许多文件下载，确认站点后允许。等待控制台输出结果表格，再按 `Command + J`（Windows/Linux：`Ctrl + J`）查看 Chrome 下载记录。逐项核对文件名、数量、大小及文件能否打开。浏览器可能拦截弹窗、多文件下载或文件地址；“已请求下载”并不表示成功。失败的文件重新尝试或使用平台提供的下载入口。

```javascript
(async () => {
  const activityId = 67890; // 修改为当前活动的 ID
  const base = location.pathname.split('/course/')[0];
  const results = [];
  const response = await fetch(`${base}/api/activities/${activityId}`);
  if (!response.ok) {
    console.error('读取活动失败：', response.status);
    return;
  }
  const activity = await response.json();
  for (const item of activity.uploads.filter(x => /\.(pdf|pptx?)$/i.test(x.name))) {
    try {
      const detailResponse = await fetch(`${base}/api/uploads/${item.id}`);
      if (!detailResponse.ok) throw new Error(`读取详情失败：${detailResponse.status}`);
      const detail = await detailResponse.json();
      if (detail.allow_download !== true) {
        results.push({文件名: item.name, 结果: '跳过：文件详情未允许下载'});
        continue;
      }
      const linkResponse = await fetch(`${base}/api/uploads/${item.id}/url`);
      if (!linkResponse.ok) throw new Error(`获取链接失败：${linkResponse.status}`);
      const {url} = await linkResponse.json();
      if (!url) throw new Error('接口没有返回下载链接');
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      results.push({文件名: item.name, 结果: '已请求下载，请检查 Chrome 下载记录'});
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({文件名: item.name, 结果: error.message});
    }
  }
  console.table(results);
})();
```

`ERR_BLOCKED_BY_CLIENT` 表示客户端拦截了请求，但不能据此认定具体是哪个扩展或组件。若出现该错误，先检查浏览器下载记录、弹窗和扩展提示，并确认网络能访问文件地址；不要将临时下载链接公开。平台明确禁止下载的文件不应强行绕过。
