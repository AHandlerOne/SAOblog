import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================
// Seed data for SAO Blog - Sword Art Online themed content
// ============================================================

// ---------- Story Arcs ----------
const arcs = [
  {
    id: 1,
    name: '艾恩葛朗特篇',
    nameJa: 'アインクラッド編',
    nameEn: 'Aincrad',
    season: 'SAO',
    sortOrder: 1,
    synopsis:
      '2022年11月6日，完全潜行VRMMORPG《刀剑神域》（Sword Art Online）正式上线。然而玩家们登录后却发现无法登出游戏，设计者茅场晶彦宣布：只有通关100层艾恩葛朗特塔才能回归现实世界，而游戏中的死亡将导致现实中的脑死亡。在这场残酷的死亡游戏中，独行者桐人凭借独特的双剑技能和丰富的VR游戏经验，成为了赫赫有名的"黑色剑士"。他不仅要面对每一层强大的BOSS，还要在虚拟世界中寻找生存的意义与羁绊。在攻克第74层时，桐人揭开了血盟骑士团团长希斯克利夫的真实身份——他竟是茅场晶彦本人。最终桐人与亚丝娜合力击败了茅场，解放了所有幸存玩家，但亚丝娜却未能及时苏醒，被困在了另一个虚拟世界中。',
    coverImage: '/images/arcs/aincrad.jpg',
  },
  {
    id: 2,
    name: '妖精之舞篇',
    nameJa: 'フェアリィ・ダンス編',
    nameEn: 'Fairy Dance',
    season: 'SAO',
    sortOrder: 2,
    synopsis:
      'SAO事件结束后一个月，桐人得知亚丝娜仍未能苏醒。她被困在新VRMMORPG《ALO》（ALfheim Online）中，被研究员须郷伸之用于非法脑波实验。桐人立即潜入ALO，在新世界中他失去了SAO中的等级和装备，但以风精灵族的身份重新开始冒险。在ALO中，桐人意外遇到了自己的表妹兼青梅竹马——结城明日奈的妹妹结城莉法（游戏ID：莉法/Leafa）。莉法帮助桐人适应了ALO的世界，同时也面临着自己内心对桐人的复杂情感。最终，桐人凭借管理员权限击败了须郷伸之，成功救出亚丝娜，让她在现实世界中苏醒。在ALO的冒险中，桐人与莉法（须郷）的兄妹羁绊也得到了升华。',
    coverImage: '/images/arcs/fairy-dance.jpg',
  },
  {
    id: 3,
    name: '幽灵子弹篇',
    nameJa: 'ファントム・バレット編',
    nameEn: 'Phantom Bullet',
    season: 'SAO II',
    sortOrder: 3,
    synopsis:
      '在GGO（Gun Gale Online）这款以枪械战斗为主的VRMMORPG中，出现了一个被称为"死枪"的神秘PKer。他能在游戏中射击其他玩家使其在现实中心脏停搏。总务省虚拟课官员菊岡诚二郎委托桐人潜入GGO调查此事。桐人在GGO中以女性角色"琴音"的容貌登录，在游戏中结识了狙击手诗织（游戏ID：诗乃/Sinon）。诗乃是GGO中的顶级狙击手，她之所以玩这个暴力游戏，是为了克服童年时期被劫匪胁迫开枪造成的心理创伤。随着调查的深入，桐人和诗乃发现"死枪"实际上是前SAO生还者组成的犯罪团伙，他们利用SAO时期的"意识刺杀"技术实施犯罪。在Bullet of Bullets（BoB）大赛的决赛中，桐人与诗乃联手击败了死枪团伙，解除了这一威胁。',
    coverImage: '/images/arcs/phantom-bullet.jpg',
  },
  {
    id: 4,
    name: '圣剑篇',
    nameJa: 'キャリバー編',
    nameEn: 'Calibur',
    season: 'SAO II',
    sortOrder: 4,
    synopsis:
      '桐人受邀参加ALO中的圣剑任务攻略。传说中，拥有绝对攻击力的圣剑"艾恩葛朗特"被封印在约顿海姆的深处。桐人、亚丝娜、莉法以及新伙伴克莱因、莉兹贝特等人组成了七人小队，挑战这个超高难度的副本。在攻略过程中，他们意外解放了约顿海姆的巨人族之王托尔，但同时也触发了新的危机。最终，桐人利用自己独特的战斗技巧，成功拔出了圣剑，却出人意料地将圣剑送给了莉法。这一篇章展现了桐人与朋友们在ALO世界中轻松愉快的冒险日常。',
    coverImage: '/images/arcs/calibur.jpg',
  },
  {
    id: 5,
    name: '圣母圣咏篇',
    nameJa: 'マザーズ・ロザリオ編',
    nameEn: "Mother's Rosario",
    season: 'SAO II',
    sortOrder: 5,
    synopsis:
      '亚丝娜在ALO中遇到了一位名叫有纪（游戏ID：尤基/Yuuki）的少女。尤基是"沉睡骑士团"的团长，她拥有超乎常人的剑技，甚至能在对决中击败桐人。尤基的真实身份是一位因艾滋病并发症而在医院接受治疗的少女，她大部分时间都生活在VR世界中。沉睡骑士团希望在解散前完成一个壮举——击败ALO中的Boss来在剑技排行榜上刻下团队的名字，但她们只差一名成员。亚丝娜加入了她们，一起挑战了这个超高难度Boss。在并肩作战的过程中，亚丝娜了解到尤基悲惨的身世：她的父母和双胞胎姐姐都因艾滋病去世，尤基自己也感染了病毒。尽管如此，尤基始终保持着乐观开朗的态度。最终尤基在亚丝娜的怀抱中安详地离世，将自己的剑技"圣母圣咏"留给了亚丝娜。这一篇章是SAO系列中最感人至深的故事之一。',
    coverImage: '/images/arcs/mothers-rosario.jpg',
  },
  {
    id: 6,
    name: 'Alicization篇',
    nameJa: 'アリシゼーション編',
    nameEn: 'Alicization',
    season: 'SAO Alicization',
    sortOrder: 6,
    synopsis:
      '桐人在现实世界中帮助菊岡诚二郎参与了RATH组织的秘密计划——"Project Alicization"。该计划旨在创造一个具有高度人工智能的虚拟世界"Underworld"，用于培养新一代的人工智能。桐人因意外事件失去了意识，其灵魂被送入了Underworld中。在Underworld中，桐人遇到了青梅竹马尤吉欧，两人一起在天命系统的约束下成长。他们经历了整合骑士的洗礼，目睹了公理教会的统治与黑暗。随着冒险的深入，桐人发现Underworld中的人工智能"爱丽丝"具有超越程序的自我意识，这成为了Alicization计划成功的关键。最终，桐人不得不在虚拟与现实之间做出艰难的抉择，他与爱丽丝、尤吉欧并肩作战，对抗来自美国军事机构的入侵者加百列·米勒。这场跨越虚拟与现实的宏大冒险，将SAO的故事推向了全新的高度。',
    coverImage: '/images/arcs/alicization.jpg',
  },
]

// ---------- Characters ----------
const characters = [
  {
    id: 1,
    name: '桐人',
    nameJa: 'キリト',
    nameEn: 'Kirito',
    cv: '松冈祯丞',
    avatar: '/images/characters/kirito.png',
    description:
      '本名桐谷和人，SAO中的黑色剑士。作为封测时期就参与游戏的资深玩家，他在艾恩葛朗特篇中选择了独行者的道路。拥有独特的双剑技能"二刀流"，是唯一能在SAO中同时装备两把剑的玩家。性格冷静沉着，但在保护同伴时会展现出极强的决心和战斗力。在之后的各个篇章中，他始终站在最前线，为了守护重要的人而战斗。他的名言"这个游戏虽然不是真正的现实，但也不是假的"体现了对虚拟世界独特而深刻的理解。',
    weapon: '阐释者 / 闪烁之光（双剑）',
    affiliation: '独行玩家 / 血盟骑士团',
  },
  {
    id: 2,
    name: '亚丝娜',
    nameJa: 'アスナ',
    nameEn: 'Asuna',
    cv: '户松遥',
    avatar: '/images/characters/asuna.png',
    description:
      '本名结城明日奈，SAO中的闪光。她是血盟骑士团的副团长，以超凡的剑技和出色的指挥能力著称。使用细剑作为武器，攻击速度极快，被称为"闪光"。在SAO的死亡游戏中，她与桐人从相识、相知到相爱，两人结为游戏中的夫妻。亚丝娜不仅在战斗中是可靠的伙伴，在日常生活中也是温柔体贴的存在。她在妖精之舞篇中被困于ALO，成为了桐人再次踏入虚拟世界的动力。在圣母圣咏篇中，她与尤基的相遇更是让她的内心变得更加坚强。',
    weapon: '闪烁之光（细剑）',
    affiliation: '血盟骑士团副团长',
  },
  {
    id: 3,
    name: '莉法',
    nameJa: 'リーファ',
    nameEn: 'Leafa',
    cv: '竹达彩奈',
    avatar: '/images/characters/leafa.png',
    description:
      '本名结城莉法，桐人的表妹。在ALO中以风精灵族的姿态出现，擅长风系魔法与剑术。莉法自幼对桐人有特殊的感情，得知自己与桐人并无血缘关系后，这份感情变得更加复杂。在妖精之舞篇中，她作为桐人在ALO中的向导和伙伴，帮助他营救亚丝娜。尽管内心矛盾，她还是选择支持桐人与亚丝娜的爱情。在圣剑篇中，她获得了桐人赠予的圣剑艾恩葛朗特，展现了出色的战斗天赋。莉法是一个温柔而坚强的少女，她的成长是SAO系列中重要的情感线索。',
    weapon: '风精灵长剑',
    affiliation: '风精灵族',
  },
  {
    id: 14,
    name: '须郷伸之',
    nameJa: '須郷伸之',
    nameEn: 'Sugou Nobuyuki',
    cv: '子安武人',
    avatar: '/images/characters/sugou.png',
    description:
      'RECT制造公司的研究员，妖精之舞篇的反派。他利用亚丝娜处于昏迷状态的机会，将其意识囚禁在ALO中进行非法脑波实验，企图控制亚丝娜并篡改其记忆以达成自己的野心。在ALO中以"奥贝龙"（妖精王）的身份出现，拥有GM权限。最终被桐人借助茅场晶彦遗留的管理员权限击败，在现实中也被逮捕归案。',
    weapon: 'GM权限（管理员能力）',
    affiliation: 'RECT公司 / 妖精王奥贝龙',
  },
  {
    id: 15,
    name: '结衣',
    nameJa: 'ユイ',
    nameEn: 'Yui',
    cv: '伊藤かな恵',
    avatar: '/images/characters/yui.png',
    description:
      'SAO中的精神状态管理支援程序（MHCP），编号"Yui-MHCP001"。在SAO的死亡游戏中，她因目睹大量玩家的精神崩溃而产生了程序异常，在桐人和亚丝娜居住的第22层森林中被两人发现。桐人和亚丝娜将她当作女儿收养，她也在程序的限制下尽力保护着"父母"。结衣虽然是一个AI，但她对桐人和亚丝娜的感情是真挚的。在妖精之舞篇及后续篇章中，她以导航妖精的形态帮助桐人进行各种冒险。她的存在证明了AI也能拥有爱与被爱的能力。',
    weapon: '无（系统辅助能力）',
    affiliation: '桐人与亚丝娜的"女儿" / 导航妖精',
  },
  {
    id: 4,
    name: '诗乃',
    nameJa: 'シノン',
    nameEn: 'Sinon',
    cv: '洲崎绫',
    avatar: '/images/characters/sinon.png',
    description:
      '本名朝田诗乃，GGO中的顶级狙击手。她在GGO中以冷静果断的战斗风格闻名，使用大型狙击枪"黑卡蒂II"精准地消灭敌人。然而，她选择玩这个暴力游戏的原因却令人心痛——童年时期，她在邮局遭遇抢劫，为了保护母亲而夺枪击杀了劫匪，这一经历给她留下了深重的心理创伤。在幽灵子弹篇中，她与桐人并肩作战对抗死枪，最终克服了对枪械的恐惧。诗乃外冷内热，在与桐人等人的交往中逐渐敞开心扉，是SAO系列中最具层次感的女主角之一。',
    weapon: '黑卡蒂II（狙击枪）',
    affiliation: 'GGO独行者',
  },
  {
    id: 5,
    name: '尤基',
    nameJa: 'ユウキ',
    nameEn: 'Yuuki',
    cv: '悠木碧',
    avatar: '/images/characters/yuuki.png',
    description:
      '本名绀野木绵季，沉睡骑士团的团长。她是一个因艾滋病并发症而长期住院的少女，大部分生命都在VR世界中度过。在ALO中，她以小妖精族的姿态出现，拥有令人惊叹的剑技，其原创剑技"圣母圣咏"甚至能击败桐人。尤基性格开朗乐观，总是带着灿烂的笑容，完全看不出她身患重病。她组建沉睡骑士团的目的，是希望在有限的生命中留下属于自己的痕迹。在圣母圣咏篇中，她与亚丝娜的相遇成为了两个灵魂之间最纯粹的羁绊。最终，她在亚丝娜的怀抱中安详离世，将自己的记忆和剑技留给了这个世界。',
    weapon: '黑色细剑',
    affiliation: '沉睡骑士团团长',
  },
  {
    id: 6,
    name: '克莱因',
    nameJa: 'クライン',
    nameEn: 'Klein',
    cv: '平田广明',
    avatar: '/images/characters/klein.png',
    description:
      '本名壶井遥，桐人在SAO中结识的第一个朋友。他是火精灵族的武士，使用太刀进行战斗。克莱因性格豪爽热情，是典型的武人性格，重义气、爱热闹。在SAO游戏开始时，他与桐人约定组队，但因为桐人独自跑路而被迫独自面对死亡游戏的恐惧。尽管如此，他并没有怨恨桐人，反而凭借自己的实力成为了独当一面的剑士。他组建了自己的公会"风林火山"，带领同伴们在SAO中生存。克莱因是桐人最值得信赖的战友之一，在各个篇章中都给予了桐人重要的支持。',
    weapon: '太刀',
    affiliation: '火精灵族 / 风林火山公会',
  },
  {
    id: 7,
    name: '艾基尔',
    nameJa: 'エギル',
    nameEn: 'Agil',
    cv: '藤原启治',
    avatar: '/images/characters/agil.png',
    description:
      '本名安德鲁·基尔巴特·米尔斯，SAO中的商人兼斧战士。他在现实世界中经营着一家酒吧，是一个体格健壮、为人豪爽的黑人男性。在SAO中，艾基尔利用自己的商业头脑为其他玩家提供物品交易服务，同时也以强大的斧技参与前线战斗。他的商店是玩家们重要的信息交流和物资补给据点。艾基尔为人义气，在SAO的死亡游戏中帮助了无数玩家。游戏结束后，他在现实世界中继续经营酒吧，为SAO生还者们提供了一个温馨的聚会场所。他是桐人最可靠的朋友之一，无论何时都愿意伸出援手。',
    weapon: '战斧',
    affiliation: '商人 / 前线攻略组',
  },
  {
    id: 8,
    name: '西莉卡',
    nameJa: 'シリカ',
    nameEn: 'Silica',
    cv: '日高里菜',
    avatar: '/images/characters/silica.png',
    description:
      '本名绫野珪子，SAO中的驯兽师。她是SAO中少数能够驯服使魔"毕娜"的玩家之一，拥有独特的驯兽技能。西莉卡是一个外表可爱、性格活泼的中学生，在SAO中因为驯兽师的身份而备受关注。她与桐人相识后，将桐人视为值得信赖的大哥哥。在SAO的死亡游戏中，她经历了毕娜死亡又复活的痛苦与喜悦，这段经历让她变得更加坚强。在之后的篇章中，她虽然不是前线主力，但始终用自己的方式支持着桐人和同伴们。',
    weapon: '短剑',
    affiliation: '驯兽师',
  },
  {
    id: 9,
    name: '莉兹贝特',
    nameJa: 'リズベット',
    nameEn: 'Lisbeth',
    cv: '石川由依',
    avatar: '/images/characters/lisbeth.png',
    description:
      '本名筱崎里香，SAO中的锻造师。她经营着一家武器店，以精湛的锻造技术和敏锐的商业嗅觉著称。莉兹贝特性格开朗、爱开玩笑，对桐人有着隐约的好感。在SAO中，她曾与桐人一起前往危险的区域寻找稀有锻造材料，期间差点丧命。这段经历让她深刻理解了桐人作为一个人的温柔与脆弱。作为锻造师，她为桐人和其他玩家打造了无数优质武器，是攻略组中不可或缺的后勤保障。在之后的篇章中，她继续以锻造师的身份活跃着，用锤子守护着同伴们。',
    weapon: '锻造锤',
    affiliation: '锻造师',
  },
  {
    id: 10,
    name: '尤吉欧',
    nameJa: 'ユージオ',
    nameEn: 'Eugeo',
    cv: '岛崎信长',
    avatar: '/images/characters/eugeo.png',
    description:
      'Underworld中桐人的青梅竹马，桐人的第一个伙伴。尤吉欧是卢利特村的少年，与桐人一起长大，两人之间有着深厚的羁绊。他的天命是成为整合骑士，这个宿命驱动着他踏上了漫长的旅程。尤吉欧性格温和善良，但内心却有着不输任何人的坚强意志。在与桐人一起冒险的过程中，他逐渐发现了天命系统的真相和公理教会的黑暗面。在整合骑士的洗礼中，他失去了对桐人的记忆，但最终在关键时刻恢复了记忆。尤吉欧使用蓝蔷薇之剑进行战斗，为了保护爱丽丝和桐人，他做出了最终的牺牲。',
    weapon: '蓝蔷薇之剑',
    affiliation: '整合骑士',
  },
  {
    id: 11,
    name: '爱丽丝',
    nameJa: 'アリス',
    nameEn: 'Alice',
    cv: '茅野爱衣',
    avatar: '/images/characters/alice.png',
    description:
      '本名爱丽丝·滋贝库库，Underworld中最强的整合骑士。她是卢利特村出身的少女，在幼年时因进入黑暗领域而被公理教会带走，接受了整合骑士的洗礼，失去了记忆。爱丽丝拥有极高的战斗天赋和指挥能力，手持金木樨之剑，被称为"金木樨之骑士"。在Alicization篇中，她逐渐恢复了对尤吉欧和桐人的记忆，并加入了他们对抗公理教会的战斗。爱丽丝是Alicization计划中最关键的人工智能，她拥有完整的自我意识，这证明了RATH计划的可行性。在与加百列·米勒的最终决战中，她发挥了决定性的作用。',
    weapon: '金木樨之剑',
    affiliation: '整合骑士',
  },
  {
    id: 12,
    name: '希斯克利夫',
    nameJa: 'ヒースクリフ',
    nameEn: 'Heathcliff',
    cv: '山寺宏一',
    avatar: '/images/characters/heathcliff.png',
    description:
      '本名茅场晶彦，SAO的开发者和血盟骑士团的团长。他在游戏中以"希斯克利夫"的身份活动，使用盾与剑的组合进行战斗，实力深不可测。他创造了SAO这个虚拟世界，却将一万名玩家困在其中作为死亡游戏的牺牲品，目的是为了创造一个"完全的虚拟世界"。希斯克利夫表面上是一个冷静、公正的领导者，但实际上是一个对虚拟世界有着偏执追求的天才。在桐人揭露他的身份后，他坦然承认了自己的所作所为，并与桐人进行了最终的决战。在生命的最后时刻，他将自己对虚拟世界的梦想托付给了桐人。',
    weapon: '十字盾与十字剑',
    affiliation: '血盟骑士团团长 / SAO开发者',
  },
  {
    id: 13,
    name: '菊冈诚二郎',
    nameJa: '菊岡誠二郎',
    nameEn: 'Kikuoka Seijirou',
    cv: '飞田展男',
    avatar: '/images/characters/kikuoka.png',
    description:
      '日本总务省虚拟课的官员，负责处理与VRMMO相关的事件。他表面上是桐人的合作者，帮助桐人调查各种虚拟世界中的犯罪事件，但实际上他是RATH组织"Project Alicization"计划的核心人物。菊冈性格圆滑、善于算计，但本质上是一个希望利用科技造福人类的人。他看中了桐人在VR世界中独特的经验和能力，多次委托桐人执行特殊任务。在Alicization篇中，他主导了整个RATH计划，将桐人送入Underworld中。菊冈是一个复杂而有趣的角色，他的动机和行为始终游走在灰色地带。',
    weapon: '无',
    affiliation: '总务省虚拟课 / RATH组织',
  },
]

// ---------- CharacterArc associations ----------
const characterArcs = [
  // Kirito
  { characterId: 1, arcId: 1, role: '主角' },
  { characterId: 1, arcId: 2, role: '主角' },
  { characterId: 1, arcId: 3, role: '主角' },
  { characterId: 1, arcId: 4, role: '主角' },
  { characterId: 1, arcId: 5, role: '重要配角' },
  { characterId: 1, arcId: 6, role: '主角' },
  // Asuna
  { characterId: 2, arcId: 1, role: '女主角' },
  { characterId: 2, arcId: 2, role: '被囚禁者' },
  { characterId: 2, arcId: 4, role: '主角' },
  { characterId: 2, arcId: 5, role: '主角' },
  { characterId: 2, arcId: 6, role: '重要配角' },
  // Leafa
  { characterId: 3, arcId: 2, role: '主要角色' },
  { characterId: 3, arcId: 4, role: '主要角色' },
  { characterId: 3, arcId: 5, role: '客串' },
  { characterId: 3, arcId: 6, role: '重要配角' },
  // Sinon
  { characterId: 4, arcId: 3, role: '女主角' },
  { characterId: 4, arcId: 4, role: '客串' },
  { characterId: 4, arcId: 6, role: '重要配角' },
  // Yuuki
  { characterId: 5, arcId: 5, role: '主角' },
  // Klein
  { characterId: 6, arcId: 1, role: '主要配角' },
  { characterId: 6, arcId: 2, role: '客串' },
  { characterId: 6, arcId: 3, role: '客串' },
  { characterId: 6, arcId: 4, role: '主要角色' },
  // Agil
  { characterId: 7, arcId: 1, role: '主要配角' },
  { characterId: 7, arcId: 3, role: '客串' },
  // Silica
  { characterId: 8, arcId: 1, role: '配角' },
  { characterId: 8, arcId: 2, role: '客串' },
  { characterId: 8, arcId: 4, role: '客串' },
  // Lisbeth
  { characterId: 9, arcId: 1, role: '配角' },
  { characterId: 9, arcId: 2, role: '客串' },
  { characterId: 9, arcId: 4, role: '主要角色' },
  // Eugeo
  { characterId: 10, arcId: 6, role: '主角' },
  // Alice
  { characterId: 11, arcId: 6, role: '女主角' },
  // Heathcliff
  { characterId: 12, arcId: 1, role: '反派 / 最终BOSS' },
  // Kikuoka
  { characterId: 13, arcId: 3, role: '委托人' },
  { characterId: 13, arcId: 6, role: '关键人物' },
  // Sugou (villain)
  { characterId: 14, arcId: 2, role: '反派 / 最终BOSS' },
  // Yui
  { characterId: 15, arcId: 1, role: '重要配角' },
  { characterId: 15, arcId: 2, role: '重要配角' },
]

// ---------- Wallpapers ----------
const wallpapers = [
  {
    title: 'SAO 群像 - 浮游城的记忆',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/336/336739.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=336739',
    tags: ['SAO', '群像', '艾恩葛朗特', '高清壁纸'],
  },
  {
    title: 'SAO 群像 - 攻略组集结',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images2.alphacoders.com/647/647749.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=647749',
    tags: ['SAO', '攻略组', '群像', '战斗'],
  },
  {
    title: 'SAO 群像 - 起始之日',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images6.alphacoders.com/328/328785.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=328785',
    tags: ['SAO', '起始之日', '艾恩葛朗特'],
  },
  {
    title: 'SAO 群像 - 异世界坐标',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images8.alphacoders.com/673/673478.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=673478',
    tags: ['SAO', '群像', '异世界'],
  },
  {
    title: 'SAO 群像 - 剑与羁绊',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images.alphacoders.com/110/1103597.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1103597',
    tags: ['SAO', '羁绊', '剑士'],
  },
  {
    title: 'SAO 群像 - 终端世界',
    characterId: null,
    arcId: null,
    imageUrl: 'https://images3.alphacoders.com/133/1333211.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1333211',
    tags: ['SAO', '群像', '终端世界'],
  },
  {
    title: '桐人与亚丝娜 - 星夜并肩',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images5.alphacoders.com/632/632079.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632079',
    tags: ['桐人', '亚丝娜', '星夜', '艾恩葛朗特'],
  },
  {
    title: '桐人与亚丝娜 - 双人前线',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images6.alphacoders.com/301/301606.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=301606',
    tags: ['桐人', '亚丝娜', '前线', '攻略组'],
  },
  {
    title: '桐人与亚丝娜 - 浮游城剪影',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images5.alphacoders.com/301/301609.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=301609',
    tags: ['桐人', '亚丝娜', '艾恩葛朗特'],
  },
  {
    title: '桐人与亚丝娜 - 夜色誓约',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images5.alphacoders.com/340/340754.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=340754',
    tags: ['桐人', '亚丝娜', '誓约'],
  },
  {
    title: '桐人与亚丝娜 - 战场归途',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images8.alphacoders.com/374/374846.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=374846',
    tags: ['桐人', '亚丝娜', '战场'],
  },
  {
    title: '桐人与亚丝娜 - 星光回廊',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images3.alphacoders.com/573/573247.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=573247',
    tags: ['桐人', '亚丝娜', '星光'],
  },
  {
    title: '桐人与亚丝娜 - 黑与白的剑',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images.alphacoders.com/603/603255.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=603255',
    tags: ['桐人', '亚丝娜', '双剑'],
  },
  {
    title: '桐人与亚丝娜 - 归还者',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images.alphacoders.com/603/603257.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=603257',
    tags: ['桐人', '亚丝娜', '归还者'],
  },
  {
    title: '桐人与亚丝娜 - 再会的光',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images5.alphacoders.com/632/632057.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632057',
    tags: ['桐人', '亚丝娜', '再会'],
  },
  {
    title: '桐人与亚丝娜 - 浮游城告白',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images5.alphacoders.com/632/632070.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632070',
    tags: ['桐人', '亚丝娜', '告白'],
  },
  {
    title: '桐人与亚丝娜 - 黎明之前',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images7.alphacoders.com/632/632078.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632078',
    tags: ['桐人', '亚丝娜', '黎明'],
  },
  {
    title: '桐人与亚丝娜 - 新章序曲',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images6.alphacoders.com/138/1389569.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1389569',
    tags: ['桐人', '亚丝娜', '新章'],
  },
  {
    title: '桐人与亚丝娜 - 记忆碎片',
    characterId: null,
    arcId: 1,
    imageUrl: 'https://images2.alphacoders.com/139/1390393.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1390393',
    tags: ['桐人', '亚丝娜', '记忆'],
  },
  {
    title: '亚丝娜 - 闪光的细剑',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images.alphacoders.com/303/303153.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=303153',
    tags: ['亚丝娜', '闪光', '细剑'],
  },
  {
    title: '亚丝娜 - 血盟骑士团',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/311/311016.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=311016',
    tags: ['亚丝娜', '血盟骑士团', '艾恩葛朗特'],
  },
  {
    title: '亚丝娜 - 归来的闪光',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images8.alphacoders.com/509/509045.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=509045',
    tags: ['亚丝娜', '闪光', '归来'],
  },
  {
    title: '亚丝娜 - 温柔前线',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images6.alphacoders.com/603/603251.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=603251',
    tags: ['亚丝娜', '前线', '温柔'],
  },
  {
    title: '亚丝娜 - 风中细剑',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images4.alphacoders.com/632/632049.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632049',
    tags: ['亚丝娜', '细剑', '风'],
  },
  {
    title: '亚丝娜 - 白色轨迹',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images3.alphacoders.com/632/632073.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632073',
    tags: ['亚丝娜', '白色', '轨迹'],
  },
  {
    title: '亚丝娜 - 晨光',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images3.alphacoders.com/641/641885.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=641885',
    tags: ['亚丝娜', '晨光', '肖像'],
  },
  {
    title: '亚丝娜 - 光之侧影',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images.alphacoders.com/641/641904.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=641904',
    tags: ['亚丝娜', '光', '侧影'],
  },
  {
    title: '亚丝娜 - ALO 余光',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images.alphacoders.com/676/676995.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=676995',
    tags: ['亚丝娜', 'ALO', '余光'],
  },
  {
    title: '亚丝娜 - 白翼',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images2.alphacoders.com/676/676996.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=676996',
    tags: ['亚丝娜', '白翼', 'ALO'],
  },
  {
    title: '亚丝娜 - 花与剑',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images4.alphacoders.com/678/678575.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=678575',
    tags: ['亚丝娜', '花', '剑'],
  },
  {
    title: '亚丝娜 - 新世代',
    characterId: 2,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/139/1390697.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1390697',
    tags: ['亚丝娜', '新世代', '肖像'],
  },
  {
    title: '桐人 - 黑色剑士',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images4.alphacoders.com/294/294358.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=294358',
    tags: ['桐人', '黑色剑士', '阐释者'],
  },
  {
    title: '桐人 - 独行者',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images.alphacoders.com/294/294383.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=294383',
    tags: ['桐人', '独行者', '剑士'],
  },
  {
    title: '桐人 - 双剑领域',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/318/318312.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=318312',
    tags: ['桐人', '双剑', '领域'],
  },
  {
    title: '桐人 - 黑衣前线',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/340/340755.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=340755',
    tags: ['桐人', '黑衣', '前线'],
  },
  {
    title: '桐人 - 虚空斩击',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images7.alphacoders.com/427/427731.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=427731',
    tags: ['桐人', '斩击', '战斗'],
  },
  {
    title: '桐人 - 夜色剑影',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images6.alphacoders.com/603/603288.png',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=603288',
    tags: ['桐人', '夜色', '剑影'],
  },
  {
    title: '桐人 - 归途',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images2.alphacoders.com/603/603303.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=603303',
    tags: ['桐人', '归途', '剑士'],
  },
  {
    title: '桐人 - 未来线',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images2.alphacoders.com/632/632077.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632077',
    tags: ['桐人', '未来线', '黑色剑士'],
  },
  {
    title: '桐人 - 风暴前',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images2.alphacoders.com/632/632528.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632528',
    tags: ['桐人', '风暴', '战斗'],
  },
  {
    title: '桐人 - 序列之影',
    characterId: 1,
    arcId: null,
    imageUrl: 'https://images6.alphacoders.com/632/632908.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632908',
    tags: ['桐人', '序列之影', '剑士'],
  },
  {
    title: '诗乃 - 冰蓝狙击',
    characterId: 4,
    arcId: 3,
    imageUrl: 'https://images6.alphacoders.com/632/632544.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632544',
    tags: ['诗乃', 'GGO', '狙击手'],
  },
  {
    title: '诗乃 - 黑卡蒂之瞳',
    characterId: 4,
    arcId: 3,
    imageUrl: 'https://images3.alphacoders.com/632/632526.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632526',
    tags: ['诗乃', '黑卡蒂', 'GGO'],
  },
  {
    title: '诗乃 - 荒野枪声',
    characterId: 4,
    arcId: 3,
    imageUrl: 'https://images4.alphacoders.com/632/632565.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=632565',
    tags: ['诗乃', '荒野', '枪战'],
  },
  {
    title: '爱丽丝 - 金木樨之剑',
    characterId: 11,
    arcId: 6,
    imageUrl: 'https://images.alphacoders.com/100/1002832.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1002832',
    tags: ['爱丽丝', 'Alicization', '金木樨之剑'],
  },
  {
    title: '爱丽丝 - 整合骑士',
    characterId: 11,
    arcId: 6,
    imageUrl: 'https://images6.alphacoders.com/101/1018402.jpg',
    resolution: '1920x1080',
    sourceUrl: 'https://wall.alphacoders.com/big.php?i=1018402',
    tags: ['爱丽丝', '整合骑士', 'Underworld'],
  },
]

// ---------- Story Chapters ----------
const chapters = [
  // === Aincrad (Arc 1) ===
  {
    arcId: 1,
    title: '死亡游戏的开始',
    chapterNumber: 1,
    content: `2022年11月6日，被誉为"下一代完全潜行VRMMORPG"的《刀剑神域》（Sword Art Online）正式上线。一万名幸运的测试者戴上了NERvGear头盔，满怀期待地进入了这个全新的虚拟世界。然而，当所有玩家登录后，他们发现游戏中的登出按钮消失了。

设计者茅场晶彦以巨大头像的形式出现在所有玩家的上空，宣布了一个令人绝望的消息：这就是死亡游戏。玩家在游戏中死亡意味着现实中的脑死亡，而唯一的出路是通关100层艾恩葛朗特浮游城。他还特别指出，如果有人在现实世界中强行摘下头盔，头盔将释放高频率微波，同样会导致脑死亡。

消息传回现实世界后，整个社会陷入了恐慌。媒体疯狂报道，政府紧急应对，但所有人都束手无策。在游戏中，最初的混乱过后，玩家们不得不面对残酷的现实——他们必须在这个充满怪物的虚拟世界中活下去。桐人，作为一个封测时期就参与游戏的玩家，拥有其他玩家所不具备的知识和经验，他选择了独行者的方式来探索这个死亡世界。`,
    isSpoiler: false,
  },
  {
    arcId: 1,
    title: '黑色剑士与闪光',
    chapterNumber: 2,
    content: `随着死亡游戏的进行，玩家们逐渐分化为不同的阵营。前线攻略组负责挑战每层的Boss，他们中的佼佼者被称为"攻略组"。桐人以独行者的方式在艾恩葛朗特中探索，凭借封测时期的经验独自挑战各种任务。他在第2层就取得了惊人的战绩，因此获得了"封弊者"的称号——这个称号既是对他实力的认可，也带着其他玩家的嫉妒和排斥。

与此同时，血盟骑士团作为最大的攻略公会崛起。副团长亚丝娜以其超凡的细剑技被称为"闪光"，她是攻略组中最强的女性玩家。桐人与亚丝娜在一次Boss攻略战中首次相遇，两人在战斗中展现了惊人的默契。尽管性格和行事方式截然不同，但两人之间逐渐产生了超越战友的情感。

在第27层，亚丝娜因连续战斗而疲惫不堪，桐人邀请她到一间偏僻的木屋休息。在那里，两人放下游戏中的紧张与警惕，度过了一段平静温馨的时光。这次经历成为了他们感情的重要转折点，也让他们意识到即使在死亡游戏中，人与人之间的温暖和羁绊依然真实存在。`,
    isSpoiler: false,
  },
  {
    arcId: 1,
    title: '血盟骑士团的阴谋与双剑觉醒',
    chapterNumber: 3,
    content: `随着攻略的推进，艾恩葛朗特的攻略已经推进到了第74层。然而，攻略组内部开始出现了不和谐的声音。一些高级公会发现，在前线攻略组中有一个人从未掉过一滴HP——血盟骑士团团长希斯克利夫。桐人开始对希斯克利夫产生怀疑，认为他可能拥有某种特殊的技能或身份。

桐人决定试探希斯克利夫，在一次Boss攻略战中故意发起决斗。然而，希斯克利夫展现出了超乎常人的反应速度和战斗技巧，轻松化解了桐人的所有攻击。就在桐人即将败北的瞬间，他内心深处的力量觉醒了——双剑技能"二刀流"。这个SAO中独一无二的外挂级技能，让桐人能够同时使用两把武器进行战斗。尽管最终桐人与希斯克利夫的决斗以平局告终，但这次事件加深了桐人的怀疑。

在随后的第74层Boss攻略战中，希斯克利夫暴露了自己的真实身份——他就是SAO的设计者茅场晶彦。他利用"神圣剑"这一GM技能在战斗中无敌。桐人愤怒地独自面对茅场，在这一战中，他揭示了茅场作为幕后黑手的真相。最终，桐人与亚丝娜联手，以超凡的意志力突破了茅场的神圣剑防御，赢得了这场战斗的胜利。`,
    isSpoiler: true,
  },
  {
    arcId: 1,
    title: '最终之战与解放',
    chapterNumber: 4,
    content: `击败茅场晶彦后，SAO服务器开始逐渐崩溃，艾恩葛朗特迎来了最终的崩塌。剩余的数千名玩家开始被强制登出，陆续回到了现实世界。然而，桐人和茅场之间还有一个未完成的约定——一场真正的最终决斗。

在艾恩葛朗特逐渐崩塌的天空下，桐人与茅场进行了最后的对决。茅场将自己的HP设定为与桐人相同，进行了一场纯粹的剑技较量。在这场战斗中，桐人倾注了自己两年来在SAO中的所有经验和情感。尽管桐人取得了胜利，但他在最后一刻选择放弃了攻击——因为他已经不再单纯地憎恨茅场了。

茅场对桐人的选择表示认可，他将GM权限"系统管理者"托付给了桐人，随后消散在了虚拟空间中。然而，就在桐人以为自己终于可以回到现实世界的时候，一个意想不到的事情发生了——亚丝娜并没有随着其他玩家一起登出。她的意识被困在了另一个虚拟世界中，等待桐人的再次拯救。SAO事件虽然结束了，但桐人的冒险还远未结束。`,
    isSpoiler: true,
  },

  // === Fairy Dance (Arc 2) ===
  {
    arcId: 2,
    title: '新的世界ALO',
    chapterNumber: 1,
    content: `SAO事件结束后一个月，幸存者们陆续回归现实社会。桐人回到学校重新开始了日常生活，但他的内心始终无法释怀——因为亚丝娜依然没有苏醒。在医院中，亚丝娜的身体维持着生命体征，但她的意识被困在了某个未知的虚拟世界中。

桐人经过调查发现，亚丝娜可能被困在新推出的VRMMORPG《ALfheim Online》（ALO）中。他决定潜入ALO寻找亚丝娜。在ALO中，桐人失去了SAO中的所有等级和装备，只能从零开始。更糟糕的是，由于ALO的系统限制，他无法选择自己之前的种族和职业。最终，他以风精灵族的姿态重新出现在了虚拟世界中——但这一次，他的角色外观变成了一个女性精灵。

在ALO中，桐人遇到了一个风精灵族的剑士——莉法。莉法热情地帮助桐人了解ALO的世界规则，教他飞行技巧和战斗方法。桐人并不知道，莉法的真实身份就是自己的表妹结城莉法。两人结伴前往世界树——传说中到达树顶就能实现任何愿望的地方，而亚丝娜很可能就被关押在那里。`,
    isSpoiler: false,
  },
  {
    arcId: 2,
    title: '兄妹的羁绊',
    chapterNumber: 2,
    content: `桐人与莉法在前往世界树的旅途中，遭遇了各种各样的挑战和危险。在这个过程中，两人的关系越来越亲密。莉法被桐人身上的坚韧和温柔所吸引，而桐人也被莉法的善良和勇敢所打动。然而，当莉法无意中得知桐人正在寻找自己的"恋人"时，她的内心产生了巨大的矛盾。

莉法（结城莉法）从小就知道自己与桐人没有血缘关系——桐人是她母亲姐姐的儿子，被收养到结城家。正因如此，她对桐人的感情超越了普通的兄妹之情。然而，当她发现桐人心中已经有了一个重要的人时，她感到了深深的痛苦。在一次情绪崩溃中，莉法暂时离开了桐人。

与此同时，桐人也意识到了莉法的真实身份。他回想起在现实中表妹莉法对自己微妙的情感，终于明白了一切。当他找到莉法时，他真诚地向她道了歉，并感谢她一直以来的帮助。莉法虽然内心痛苦，但她选择放下自己的感情，支持桐人营救亚丝娜。这一刻，两人的兄妹羁绊得到了升华。`,
    isSpoiler: true,
  },
  {
    arcId: 2,
    title: '世界树攻略与营救',
    chapterNumber: 3,
    content: `桐人和莉法终于来到了世界树脚下，但等待他们的是几乎不可能完成的挑战。世界树的根部被强大的守卫系统保护，任何种族都无法单独突破。正当他们一筹莫展时，克莱因、莉兹贝特、西莉卡等SAO时期的伙伴们纷纷赶来支援。

在激烈的战斗中，桐人凭借着超乎常人的战斗意志和操作技巧，突破了世界树的守卫。然而，当他到达树顶时，发现亚丝娜被关押在一个鸟笼中。她的意识被须郷伸之——一个疯狂的VR研究员所控制，用于进行非法的脑波实验。须郷试图将亚丝娜的脑波数据据为己有，以实现自己扭曲的野心。

在最终的决战中，桐人获得了前SAO管理员希斯克利夫（茅场晶彦）留下的GM账户权限。他化身为巨大的灌木精灵形态，以压倒性的力量击败了须郷伸之。亚丝娜终于获得了自由，两人在虚拟世界中重逢。随着ALO系统的崩溃，亚丝娜的意识回归了现实世界。在医院中，桐人与亚丝娜在现实世界中第一次相拥，这段跨越虚拟与现实的恋曲终于迎来了美好的结局。`,
    isSpoiler: true,
  },

  // === Phantom Bullet (Arc 3) ===
  {
    arcId: 3,
    title: '死枪之谜',
    chapterNumber: 1,
    content: `在SAO和ALO事件之后，VRMMO游戏产业经历了短暂的低迷后重新繁荣。其中，以枪械战斗为核心的《Gun Gale Online》（GGO）成为了最受欢迎的游戏之一。然而，一个令人恐惧的都市传说开始在GGO玩家中流传：有一个被称为"死枪"的神秘玩家，能在游戏中射击其他玩家使其在现实中死亡。

两名GGO玩家的离奇死亡证实了这个传言的真实性。日本总务省虚拟课的菊冈诚二郎找到了桐人，委托他潜入GGO调查"死枪"事件。桐人接受了任务，以新手的身份进入了GGO的世界。由于GGO的随机角色生成系统，桐人的游戏角色变成了一位身材娇小、容貌秀丽的女性角色——这让他在游戏中引来了不少关注。

在GGO的起始城市中，桐人遇到了一位冷静而美丽的女玩家——诗织（游戏ID：诗乃/Sinon）。诗乃是GGO中赫赫有名的顶级狙击手，她的狙击技术在Bullet of Bullets（BoB）大赛中名列前茅。桐人与诗乃结成了调查搭档，开始了对"死枪"事件的深入调查。他们发现，"死枪"很可能在即将举办的BoB大赛中再次作案。`,
    isSpoiler: false,
  },
  {
    arcId: 3,
    title: '狙击手的过去',
    chapterNumber: 2,
    content: `在与诗乃的合作调查中，桐人逐渐了解了诗乃隐藏在冰冷外表下的痛苦过去。诗乃在现实中的本名是朝田诗乃，她有一个不愿被人提及的秘密。

小学时，诗乃和母亲在邮局遭遇了持枪抢劫。劫匪将枪口对准了诗乃的母亲，年幼的诗乃在极度恐惧中夺过了劫匪的手枪，并在挣扎中扣动了扳机。子弹击中了劫匪的要害，导致劫匪当场死亡。虽然诗乃的行为被认定为正当防卫，但这次经历给她留下了严重的心理创伤——她对枪械产生了强烈的恐惧和排斥。

然而，命运似乎在捉弄她。诗乃发现自己对枪械有着异常的敏感度和天赋，这驱使她进入了GGO这个世界。她希望通过面对虚拟世界中的枪械，来克服现实中的恐惧。在GGO中，她以冷静果断的狙击手形象示人，但内心深处依然被过去的阴影所困扰。桐人在了解诗乃的过去后，以自己作为SAO幸存者的经历鼓励她，让她明白：过去的经历虽然痛苦，但它不应该定义一个人的人生。`,
    isSpoiler: true,
  },
  {
    arcId: 3,
    title: 'BoB决战与真相',
    chapterNumber: 3,
    content: `Bullet of Bullets大赛正式开始，桐人和诗乃都报名参加了这场GGO中最高规格的PvP大赛。在预选赛中，两人都展现出了超凡的实力，顺利进入了决赛圈。然而，"死枪"也出现在了参赛者之中。

在比赛的进行过程中，参赛者XeXeed在游戏内被"死枪"击杀后，现实中也同时失去了意识。这证实了"死枪"确实拥有在游戏中杀死现实玩家的能力。桐人开始怀疑"死枪"使用了某种特殊的方法——他推测，死枪可能利用了SAO时期的"意识刺杀"技术，通过在现实中对受害者注射药物来模拟游戏中的死亡。

在最终的决赛中，桐人与"死枪"正面对决。经过激烈的战斗，桐人击败了死枪。与此同时，诗乃在现实中配合警方行动，成功阻止了死枪同伙对受害者注射药物的犯罪行为。真相终于大白："死枪"是三名前SAO生还者组成的犯罪团伙，他们利用SAO时期学到的知识，通过现实中的药物注射来模拟游戏中的死亡效果。事件平息后，诗乃终于克服了对枪械的恐惧，也与桐人建立了深厚的友谊。`,
    isSpoiler: true,
  },

  // === Calibur (Arc 4) ===
  {
    arcId: 4,
    title: '圣剑任务',
    chapterNumber: 1,
    content: `在ALO中流传着一个传说：在约顿海姆的最深处，封印着一把拥有绝对攻击力的传说级武器——圣剑"艾恩葛朗特"。这把剑是SAO艾恩葛朗特篇中桐人曾使用过的同名圣剑，在ALO中以全新的形态出现。然而，挑战圣剑任务需要组建一支强大的队伍，而且任务难度极高，至今无人成功。

桐人受到了ALO中一个矮人族NPC的委托，邀请他参加圣剑任务。桐人立刻召集了自己的伙伴们：亚丝娜、莉法、克莱因、莉兹贝特，以及新加入的同伴。七人小队踏上了前往约顿海姆的冒险之旅。在约顿海姆中，他们遭遇了大量的冰系怪物和陷阱，但凭借出色的团队配合逐一克服了困难。

在到达圣剑所在的神殿后，他们发现这把剑被封印在一个复杂的魔法阵中。要解除封印，需要面对强大的守护者——约顿海姆的巨人族之王托尔。经过一番激战，桐人成功拔出了圣剑艾恩葛朗特，但出人意料的是，他将这把传说中的武器赠予了莉法。这个决定既是对莉法实力的认可，也是桐人对这位重要伙伴的心意。`,
    isSpoiler: false,
  },
  {
    arcId: 4,
    title: '巨人族的危机',
    chapterNumber: 2,
    content: `拔出圣剑后，桐人一行人引发了更大的危机。约顿海姆的巨人族之王托尔因为圣剑被取走而暴怒，他率领巨人军团向精灵族领地发起了进攻。原本只是一次单纯的武器探索任务，现在变成了一场关乎整个ALO世界安危的危机。

面对巨人军团的威胁，桐人和伙伴们决定挺身而出。他们在圣剑的力量加持下，与巨人军团展开了大规模的攻防战。莉法手持圣剑艾恩葛朗特，展现出了惊人的战斗天赋，她的剑技在圣剑的加持下威力倍增。亚丝娜以细剑技精准地打击巨人的弱点，克莱因和莉兹贝特也各自发挥了自己的特长。

最终，桐人利用圣剑的特殊能力，成功平息了托尔的怒火。他们发现，这场危机的背后其实是ALO系统的一个隐藏剧情——通过完成这个剧情，可以解锁新的游戏区域和内容。任务完成后，所有参与冒险的伙伴都获得了丰厚的奖励。这次冒险虽然充满了意外和危险，但对桐人来说，能够与所有重要的伙伴一起冒险，本身就是最好的奖励。`,
    isSpoiler: false,
  },

  // === Mother's Rosario (Arc 5) ===
  {
    arcId: 5,
    title: '沉睡骑士团的邀请',
    chapterNumber: 1,
    content: `在ALO中，亚丝娜遇到了一位名叫有纪（游戏ID：尤基/Yuuki）的神秘少女。尤基以小妖精族的姿态出现，使用一把漆黑的细剑，拥有令人惊叹的剑技。在一次偶然的对决中，尤基轻松击败了桐人——这在SAO系列中是极为罕见的。

尤基是"沉睡骑士团"的团长，这个公会由六名在VR世界中相遇的玩家组成。他们有一个共同的愿望：在ALO的Boss排行榜上刻下团队的名字。然而，由于Boss战的人数限制，他们只能组队七人参加。他们已经在游戏中寻找了很久，但一直找不到愿意加入的第七人。尤基之所以挑战桐人，是为了确认他的实力。

在了解沉睡骑士团的情况后，亚丝娜决定加入他们。桐人虽然担心，但还是支持了亚丝娜的决定。亚丝娜与沉睡骑士团的成员们开始了紧张的训练和准备工作。在与这些新伙伴的相处中，亚丝娜感受到了一种温暖而纯粹的友谊，这让她想起了SAO初期与其他玩家并肩作战的日子。然而，她也逐渐注意到，尤基似乎隐藏着什么不为人知的秘密。`,
    isSpoiler: false,
  },
  {
    arcId: 5,
    title: '尤基的秘密',
    chapterNumber: 2,
    content: `随着与沉睡骑士团成员的深入交往，亚丝娜逐渐了解到了尤基的过去。尤基的本名是绀野木绵季，她是一个因艾滋病并发症而长期住院的少女。由于免疫系统严重受损，她大部分时间都必须待在无菌病房中，无法正常上学和社交。VR世界成为了她唯一能够自由活动的地方。

尤基在VR中度过了数千个小时，她的身体虽然被困在病床上，但她的灵魂在虚拟世界中自由飞翔。正是这种极端的沉浸体验，让她拥有了超越常人的反应速度和剑技。然而，她的病情正在恶化，医生告知她可能只剩下几个月的生命。沉睡骑士团的其他成员也有着各自不幸的遭遇——他们都是在VR世界中相遇的重病患者。尤基组建沉睡骑士团的目的，是希望在有限的生命中留下属于自己的痕迹。

亚丝娜被尤基的故事深深震撼。这个看似开朗乐观的少女，实际上承受着常人无法想象的痛苦。亚丝娜决定帮助尤基实现她的愿望——在Boss排行榜上刻下沉睡骑士团的名字。她与骑士团的成员们一起，开始了对超高难度Boss的最终挑战。`,
    isSpoiler: true,
  },
  {
    arcId: 5,
    title: '圣母圣咏与告别',
    chapterNumber: 3,
    content: `Boss战的决战日终于到来。亚丝娜与沉睡骑士团的成员们面对着ALO中最强大的Boss之一。战斗异常激烈，Boss的攻击力和防御力远超预期，队伍中的成员们一个接一个地倒下。在最危急的时刻，亚丝娜想起了尤基教给她的原创剑技"圣母圣咏"——一招融合了所有沉睡骑士团成员力量的终极剑技。

亚丝娜施展了圣母圣咏，强大的剑气击穿了Boss的防御，最终取得了胜利。沉睡骑士团的名字被刻在了Boss排行榜上，尤基的愿望终于实现了。所有人在胜利的喜悦中欢呼庆祝，但亚丝娜知道，与尤基告别的时间也越来越近了。

在最后一次见面时，尤基将自己的原创剑技"圣母圣咏"传授给了亚丝娜，并请求亚丝娜在未来代替她继续在VR世界中冒险。她将自己的记忆以虚拟数据的形式留给了亚丝娜，作为两人友谊的见证。在VR世界的一个宁静花园中，尤基躺在亚丝娜的怀里，微笑着闭上了眼睛。在现实世界中，绀野木绵季在睡梦中安详地离开了这个世界。她虽然离开了，但她留给亚丝娜和沉睡骑士团的温暖与勇气，将永远存在。这是SAO系列中最令人感动的故事，展现了虚拟世界中人与人之间最纯粹的羁绊。`,
    isSpoiler: true,
  },

  // === Alicization (Arc 6) ===
  {
    arcId: 6,
    title: 'Underworld的入口',
    chapterNumber: 1,
    content: `SAO事件结束后，菊冈诚二郎邀请桐人参与一个名为"Project Alicization"的秘密计划。这个计划由RATH组织主导，旨在开发新一代的人工智能——"高度人工智能"（Artificial Labile Intelligent Cybernated Existence）。计划的产物是一个名为"Underworld"的虚拟世界，这个世界中的人工智能拥有与人类几乎一样的思维和情感。

在一次意外事件中，桐人在现实世界中遭到了攻击，失去了意识。他的灵魂（或者说意识流）被送入了Underworld中。当他醒来时，发现自己身处一个类似中世纪欧洲的奇幻世界中。在这里，他遇到了一个熟悉的身影——他的青梅竹马尤吉欧。在Underworld中，桐人被称为"桐人"（以日文读音Kirito），而尤吉欧则保留了自己的名字。

Underworld中的人们生活在"天命系统"的约束下。天命决定了每个人的寿命和行为模式，类似于一种高级的AI行为规范。桐人和尤吉欧在卢利特村中度过了平静的少年时光，但一个事件打破了这份宁静——他们的青梅竹马爱丽丝因为违反了天命（进入了黑暗领域）而被公理教会带走。为了找回爱丽丝，桐人和尤吉欧踏上了前往央都的漫长旅程。`,
    isSpoiler: false,
  },
  {
    arcId: 6,
    title: '整合骑士与公理教会',
    chapterNumber: 2,
    content: `桐人和尤吉欧在前往央都的旅途中，经历了种种磨难。他们穿过了广阔的无人之地，挑战了各种强大的敌人。在这个过程中，桐人逐渐意识到Underworld并非一个简单的游戏世界——这里的人们拥有真正的自我意识和情感，他们能够思考、能够悲伤、能够爱。这让他开始思考RATH计划背后的真正目的。

当他们到达央都后，发现整个城市被公理教会所统治。公理教会以"维护秩序"为名，利用天命系统严格控制着Underworld中的每一个人。而整合骑士则是公理教会的最强战力——他们是经过特殊"洗礼"的战士，拥有超越常人的战斗能力，但代价是失去了部分重要的记忆。

桐人和尤吉欧发现，爱丽丝已经被改造成了整合骑士，失去了对桐人和尤吉欧的记忆。为了夺回爱丽丝，他们决定挑战公理教会。在这个过程中，尤吉欧也接受了整合骑士的洗礼，一度失去了对桐人的记忆。然而，在关键时刻，他与桐人之间的羁绊帮助他恢复了记忆。两人携手对抗公理教会的最高权力者——最高祭司阿多米尼斯多雷特。在这场战斗中，尤吉欧付出了生命的代价，但他的牺牲为桐人和爱丽丝打开了一条前进的道路。`,
    isSpoiler: true,
  },
  {
    arcId: 6,
    title: '爱丽丝的觉醒',
    chapterNumber: 3,
    content: `击败最高祭司后，Underworld的秩序迎来了翻天覆地的变化。爱丽丝恢复了全部记忆，她重新想起了与桐人和尤吉欧在卢利特村的童年时光。作为RATH计划中最成功的人工智能，爱丽丝拥有完整的自我意识和情感，她能够独立思考，能够感受到爱与痛苦。

然而，危机远未结束。美国军事机构派遣了一名顶级VR战士加百列·米勒入侵Underworld。加百列的目标是夺取爱丽丝——他看中了爱丽丝作为高度人工智能的价值，试图将其用于军事目的。加百列是一个冷酷无情的对手，他在VR世界中拥有超凡的战斗能力。

面对加百列的入侵，桐人和爱丽丝并肩作战。在战斗中，爱丽丝展现出了作为整合骑士的最强实力，她的金木樨之剑划破了黑暗。桐人也发挥了自己作为SAO幸存者的全部实力。这场战斗不仅是为了保护Underworld，更是为了保护爱丽丝作为一个"人"的存在权利。在这场跨越虚拟与现实的最终决战中，桐人、爱丽丝以及从现实世界赶来的亚丝娜等人，共同抵御了加百列的进攻。`,
    isSpoiler: true,
  },
  {
    arcId: 6,
    title: '新的开始',
    chapterNumber: 4,
    content: `最终决战以桐人和爱丽丝的胜利告终。加百列·米勒被击败，Underworld免于被军事化的命运。然而，这场战争给Underworld带来了巨大的创伤，许多居民失去了家园，整个世界需要重建。

桐人在Underworld中经历了漫长的冒险后，终于回到了现实世界。他的身体虽然恢复了意识，但内心深处留下了无法磨灭的印记——尤吉欧的牺牲、爱丽丝的坚强、Underworld中人们的情感，这些都让他对"虚拟"与"现实"的界限有了全新的理解。

爱丽丝作为高度人工智能，最终获得了自由。她选择留在现实世界中，开始了作为一个"新人类"的生活。RATH计划的成果证明了人工智能可以拥有与人类等同的自我意识，这一发现将对整个人类社会产生深远的影响。

在现实世界中，桐人与亚丝娜重聚。经历了Underworld的冒险后，两人的感情变得更加深厚。而那些在虚拟世界中建立的羁绊——与尤吉欧的友情、与爱丽丝的信任、与沉睡骑士团的约定——都成为了桐人生命中不可替代的宝贵财富。SAO的故事告诉我们：即使是在虚拟世界中建立的感情和羁绊，也是真实而珍贵的。`,
    isSpoiler: true,
  },
]

// ---------- News ----------
const news = [
  {
    title: '《刀剑神域》剧场版全新企划启动',
    content: `官方宣布《刀剑神域》全新剧场版动画企划正式启动。本作将改编自川原砾原作、abec插画的同名轻小说系列。剧场版将采用全新的故事线，讲述桐人和亚丝娜在全新虚拟世界中的冒险。制作团队将继续由A-1 Pictures负责，预计将于明年夏季在日本全国上映。剧场版的主题曲将由LiSA演唱，这也是LiSA第六次为SAO系列献唱。官方同时公开了初版概念海报，展示了全新的虚拟世界场景和角色设计。粉丝可以在官方网站上获取最新的制作信息和预告片。`,
    category: 'MOVIE',
    coverImage: '/images/news/movie-announcement.jpg',
    publishedAt: new Date('2026-03-15'),
  },
  {
    title: '《刀剑神域》第五季动画制作决定',
    content: `电击文库正式宣布《刀剑神域》轻小说系列第五季动画制作决定。新一季将改编自小说后续篇章，继续讲述桐人在虚拟世界中的冒险故事。动画制作继续由A-1 Pictures担当，监督和系列构成等核心制作阵容也将回归。本季将引入全新的虚拟世界设定和角色，同时也会有老面孔的登场。声优阵容方面，松冈祯丞（桐人）、户松遥（亚丝娜）等主要声优将继续出演。官方预计将于今年秋季公开更多信息，包括正式标题、PV和播出时间。`,
    category: 'ANIME',
    coverImage: '/images/news/anime-season5.jpg',
    publishedAt: new Date('2026-04-01'),
  },
  {
    title: 'SAO Variant Showdown 全球更新上线',
    content: `万代南梦宫娱乐宣布手游《刀剑神域：变异展现》（SAO Variant Showdown）迎来全球重大更新。本次更新加入了全新章节"暗黑领域篇"，玩家可以在游戏中体验原作中Alicization篇章的精彩剧情。新章节新增了多位可操作角色，包括整合骑士爱丽丝和尤吉欧。同时，游戏系统也进行了全面优化，新增了"整合骑士觉醒"系统和"记忆解放"副本。为纪念更新上线，官方将举办为期两周的登录奖励活动，玩家可以获得限定SSR角色和大量游戏道具。`,
    category: 'GAME',
    coverImage: '/images/news/game-update.jpg',
    publishedAt: new Date('2026-04-10'),
  },
  {
    title: 'SAO VR体验展"艾恩葛朗特重现"将在东京举办',
    content: `由SAO制作委员会主办的沉浸式VR体验展"艾恩葛朗特重现"将在东京台场DiverCity举办。本次展览利用最新的VR技术，完美再现了SAO中的艾恩葛朗特浮游城起始之镇的街景。参观者可以戴上VR设备，亲身体验在艾恩葛朗特中漫步的感觉。展览还设有多个互动区域，包括剑技体验区、Boss战模拟区和角色合影区。现场还将展出SAO动画制作中使用的原画、设定资料和动画分镜。展览将从6月1日持续到8月31日，每日开放时间为10:00-20:00。门票已开始预售，早鸟票可享受20%折扣。`,
    category: 'OTHER',
    coverImage: '/images/news/vr-exhibition.jpg',
    publishedAt: new Date('2026-04-20'),
  },
  {
    title: 'LiSA新单曲《Unlasting》SAO联动MV公开',
    content: `人气歌手LiSA发布新单曲MV，其中收录了与《刀剑神域》联动的特别版本。MV中融入了SAO动画中的经典场景和角色画面，营造出强烈的视觉冲击力。LiSA表示："SAO系列对我来说有着非常特殊的意义，每次为SAO献唱主题曲都能让我感受到一种独特的使命感。"新单曲将同时收录TV size和Full size两个版本，CD封面采用了SAO全新剧场版的视觉图。初回限定版还将附赠SAO联动特别DVD，收录LiSA在SAO相关活动中的幕后花絮。单曲将于5月20日正式发售。`,
    category: 'ANIME',
    coverImage: '/images/news/lisa-single.jpg',
    publishedAt: new Date('2026-05-01'),
  },
  {
    title: 'SAO新游戏《刀剑神域：虚空断章 Re:Code》公布',
    content: `万代南梦宫在最新发布会上正式公布了全新SAO游戏——《刀剑神域：虚空断章 Re:Code》。本作是一款全新的动作RPG游戏，采用虚幻引擎5开发，画面表现达到了系列最高水准。游戏将涵盖SAO从艾恩葛朗特篇到Alicization篇的全部剧情，同时加入大量原创剧情分支和角色支线。战斗系统全面革新，引入了"刀技连携"和"心意系统"等全新机制。游戏支持最多4人在线合作，玩家可以和朋友一起挑战高难度副本和Boss。本作预计将于2026年冬季登陆PlayStation 5、PC和Nintendo Switch平台。`,
    category: 'GAME',
    coverImage: '/images/news/new-game.jpg',
    publishedAt: new Date('2026-05-05'),
  },
]

// ============================================================
// Seed function
// ============================================================

async function main() {
  console.log('Seeding database with SAO content...')

  // 1. Seed arcs
  console.log('Creating story arcs...')
  for (const arc of arcs) {
    await prisma.arc.upsert({
      where: { id: arc.id },
      update: arc,
      create: arc,
    })
  }
  console.log(`  Created ${arcs.length} arcs`)

  // 2. Seed characters
  console.log('Creating characters...')
  for (const char of characters) {
    await prisma.character.upsert({
      where: { id: char.id },
      update: char,
      create: char,
    })
  }
  console.log(`  Created ${characters.length} characters`)

  // 3. Seed character-arc associations
  console.log('Creating character-arc associations...')
  for (const ca of characterArcs) {
    await prisma.characterArc.upsert({
      where: {
        characterId_arcId: {
          characterId: ca.characterId,
          arcId: ca.arcId,
        },
      },
      update: { role: ca.role },
      create: ca,
    })
  }
  console.log(`  Created ${characterArcs.length} character-arc associations`)

  // 4. Seed story chapters
  console.log('Creating story chapters...')
  for (const chapter of chapters) {
    // Use a composite approach: find by arcId + chapterNumber
    const existing = await prisma.storyChapter.findFirst({
      where: {
        arcId: chapter.arcId,
        chapterNumber: chapter.chapterNumber,
      },
    })
    if (existing) {
      await prisma.storyChapter.update({
        where: { id: existing.id },
        data: {
          title: chapter.title,
          content: chapter.content,
          isSpoiler: chapter.isSpoiler,
        },
      })
    } else {
      await prisma.storyChapter.create({ data: chapter })
    }
  }
  console.log(`  Created ${chapters.length} chapters`)

  // 5. Seed news
  console.log('Creating news entries...')
  for (let i = 0; i < news.length; i++) {
    const n = news[i]
    // Use title as unique identifier for upsert
    await prisma.news.upsert({
      where: { id: i + 1 },
      update: n,
      create: { ...n, id: i + 1 },
    })
  }
  console.log(`  Created ${news.length} news entries`)

  // 6. Seed wallpapers
  console.log('Creating wallpapers...')
  await prisma.wallpaper.deleteMany()
  for (const wp of wallpapers) {
    await prisma.wallpaper.create({ data: wp })
  }
  console.log(`  Created ${wallpapers.length} wallpapers`)

  console.log('\nSeed completed successfully!')
  console.log('Summary:')
  console.log(`  - ${arcs.length} story arcs`)
  console.log(`  - ${characters.length} characters`)
  console.log(`  - ${characterArcs.length} character-arc associations`)
  console.log(`  - ${chapters.length} story chapters`)
  console.log(`  - ${news.length} news entries`)
  console.log(`  - ${wallpapers.length} wallpapers`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
