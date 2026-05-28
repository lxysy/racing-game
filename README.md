# 地平线赛车 (Forza Horizon Style Racing Game)

基于 Three.js 的第三人称赛车游戏，灵感来自《极限竞速：地平线》系列。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5174` 即可游玩。

## 控制

| 按键 | 功能 |
|------|------|
| W / ↑ | 加速 |
| S / ↓ | 刹车 / 倒车 |
| A / ← | 左转 |
| D / → | 右转 |

## 技术特性

- **环形赛道** — CatmullRomCurve3 定义 8 个控制点，闭合赛道含路面、红色路肩、白色虚线标线
- **第三人称相机** — 平滑 Lerp 跟随，速度越快拉得越远
- **街机物理** — 扭矩曲线、空气阻力、滚动摩擦、高速转向不足
- **程序化地形** — simplex-noise 双八度噪声生成丘陵，赛道区域自动压平
- **环境系统** — 300 棵随机分布树木、ACES 色调映射、雾效、方向光阴影 (2048×2048)
- **HUD** — 速度表 (km/h) 毛玻璃风格 CSS 叠加层
- **车身动态** — 加速抬头、刹车点头、转弯侧倾

## 技术栈

- [Three.js](https://threejs.org/) r175 — 3D 渲染引擎
- [Vite](https://vitejs.dev/) — 构建工具
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — 地形噪声生成

## 模型来源

赛车低模由 **[Straight Design](https://sketchfab.com/StraightDesign)** 创作，基于 [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可协议发布。

- 来源: [Low Poly Car | Diffrent wheels](https://sketchfab.com/3d-models/low-poly-car-diffrent-wheels-ac1ad37e6cf34b6e81562380c07bdf3d)
- 顶点数: ~5000 (低模)
- 包含节点: WRR / WRL / WFL / WFR (独立车轮)、CarBody、TailLight、转向节

## 项目结构

```
racing-game/
├── index.html              # 入口 HTML
├── package.json
├── low_poly_car/           # 赛车 GLTF 模型
│   ├── scene.gltf
│   ├── scene.bin
│   └── license.txt
└── src/
    ├── main.js             # 场景初始化、输入、主循环
    ├── Car.js              # 赛车模型加载、物理、车轮动画
    ├── Track.js            # 赛道生成
    ├── FollowCamera.js     # 第三人称跟随相机
    ├── Environment.js      # 地形、树木、灯光、雾
    └── HUD.js              # 速度表
```

## 许可

项目代码按 MIT 许可发布。赛车模型遵循 CC-BY-SA-4.0。
