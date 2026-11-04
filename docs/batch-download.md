# 在课程活动中批量下载已允许下载的附件

这个方法适用于自己有权访问、文件详情接口允许下载的课程活动。它逐个检查附件的 `allow_download`，对返回 `true` 的文件请求下载链接；不抓取全站内容。活动附件列表和单个文件详情中的权限字段有时不同，脚本以文件详情为准，详情不是 `true` 时跳过。

在一次 WebVPN 课程活动中，这个方法成功保存过 PDF 和 PPTX。浏览器环境及学校平台配置可能不同，脚本发起请求不代表文件已经下载完成。不要在公共场合分享链接、Cookie 或令牌。

## 操作步骤

### 怎样找到活动 ID？

1. 登录教学平台，打开目标课程的**章节**或课程内容列表。
2. 点击包含目标附件的活动，例如“课件资料”，进入能看到附件列表的活动详情页。
3. 点击浏览器地址栏，找到末尾 `learning-activity#/` 后面的数字。例如：

   ```text
   https://教学平台地址/course/12345/learning-activity#/67890
                               └课程 ID┘                    └活动 ID┘
   ```

   此例中课程 ID 是 `12345`，**活动 ID 是 `67890`**。请使用自己页面实际显示的数字，而不是这个示例。通过 WebVPN 登录时，域名前后可能多出一段路径；仍然查看 `learning-activity#/` 后面的数字。
4. 确认页面上确实列出了要下载的附件。地址如果没有 `learning-activity#/数字`，请先点击具体活动进入详情；不同版本的地址格式可能不同，不要把课程 ID 当成活动 ID。

例如活动 ID 是 `67890`，就在代码中填写 `67890`；活动 ID 不等于附件列表中每个文件的 `id`（文件 ID）。

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
