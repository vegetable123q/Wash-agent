成员
负责模块
具体任务
交付物
A 项目负责人 / Web 集成
Streamlit 页面与整体联调
搭建 app.py；页面组织成添加衣物、我的衣柜、本次洗衣约束、洗衣机状态、方案结果、报告六个区域；整合所有后端函数；负责最终运行和打包。
app.py；requirements.txt；完整可运行网页。
B 大模型衣物抽取
LLM API 与商品/吊牌信息补全
实现 API 调用；设计 prompt；从商品名、店铺名、吊牌文字、用户描述中抽取材质、颜色、洗护禁忌、风险和置信度；API 失败时兜底。
backend/llm_client.py；backend/clothing_extractor.py；backend/product_info.py。
C 衣柜记忆与洗护频率
个人衣柜、洗涤历史、穿着次数、优先级
设计衣柜数据结构；实现增删查改；记录掉色、缩水、起球、是否适合烘干和历史洗护方式；根据运动后、明天要穿、牛仔裤少洗、羊毛衫少水洗等规则给建议。
backend/wardrobe_store.py；backend/frequency_advisor.py；data/wardrobe_sample.json。
D 校园机器与时间费用
洗衣机接口、机器容量、排队、价格、天气晾晒
参考清华洗衣机接口；实现状态读取或 mock；整理小筒/标准筒/大筒、烘干 30/60/90 分钟、价格和剩余时间；实现天气/阳台/湿度输入。
backend/laundry_machine_api.py；backend/campus_context.py；machines_mock.json；machine_rules.json。
E 洗衣决策、报告和提交材料
洗护方式、分桶规则、洗衣液/洗衣袋、报告、README、视频
实现手洗/机洗/干洗判断、分桶与模式推荐；整合防串色、缩水、公共洗衣卫生、洗衣袋、洗衣液用量、烘干强度和节水节电省钱报告；准备 demo 和文档。
backend/laundry_planner.py；backend/report_generator.py；README.md；作业说明.md；demo 视频。