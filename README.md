# 四项目 T1 合并版 H5

这是一个无需后端的独立静态站点。部署时请保留以下内容在同一目录：

- `index.html`
- `styles.css`
- `app.js`
- `assets/`

流程为：受试者编号 → 项目选择 → T1 指引 → 阅读 → 结束并自动导出 CSV。

项目一至项目四依次对应：长卷-解释型、长卷-行动型、分页-解释型、分页-行动型。

CSV 字段为：`participant_id`、`project_number`、`condition`、`T1_reading_time`、`start_time`、`end_time`。阅读时长单位为毫秒，起止时间为 ISO 时间。
