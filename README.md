# 瀵诲緞 路 绠楁硶鍥捐氨 Algorithm Atlas

浠庢湰绉戝熀纭€鍒板崥涓€闅惧害鐨勪氦浜掑紡璁＄畻鏈哄涔犵珯锛?*27 涓畻娉曞疄楠屽銆?22 涓彲瑙嗗寲鏍蜂緥銆? 涓爺绌剁敓涓撻**锛屼互鍙婁紭鍖?/ Transformer / 鍐呭瓨涓変釜鏂扮殑浜や簰瀹為獙鍙般€傞」鐩噰鐢?**Vite + TypeScript + 鍘熺敓 SVG**锛屾棤鍥捐〃搴撱€佹棤杩愯鏃跺悗绔緷璧栥€?
![璁＄畻鏈哄彲瑙嗗寲鐧剧](screenshots/visuals.png)

[![CI](https://github.com/zfqxuz/algorithm-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zfqxuz/algorithm-atlas/actions/workflows/ci.yml)

**鍦ㄧ嚎璁块棶锛?http://154.222.16.237:9000/>**

**GitHub Pages锛?https://zfqxuz.github.io/algorithm-atlas/>**

**GitHub 浠撳簱锛?https://github.com/zfqxuz/algorithm-atlas>**

闈欐€佺珯鐐硅繍琛屽湪闈?root銆佸彧璇绘牴鏂囦欢绯荤粺鐨?Nginx 瀹瑰櫒涓紝浠呴€氳繃 `personal-net` 鏆撮湶 9000 绔彛銆傞儴缃蹭笌杩愮淮瑙?[`deploy/README.md`](deploy/README.md)銆?
> 鑻ユ湰鏈虹郴缁熶唬鐞嗕細鎷︽埅闈炴爣鍑嗙鍙ｏ紝璇锋妸 `154.222.16.237` 鍔犲叆浠ｇ悊缁曡繃鍒楄〃锛屾垨鏆傛椂鍏抽棴浠ｇ悊銆?
鏇村棰勮锛歔浼樺寲瀹為獙鍙癩(screenshots/optimization-lab.png) 路 [Transformer 瀹為獙鍙癩(screenshots/transformer-lab.png) 路 [鍐呭瓨瀹為獙鍙癩(screenshots/memory-lab.png) 路 [鍙鍖栫櫨绉慮(screenshots/visuals.png) 路 [绉诲姩绔洰褰昡(screenshots/visuals-mobile.png) 路 [鎵嬫満绔睍寮€](screenshots/gallery-modal-mobile.png) 路 [鎺掑簭瀹為獙瀹(screenshots/sorting-lab.png) 路 [绾㈤粦鏍慮(screenshots/structures-rb.png) 路 [璋冨害瀹為獙瀹(screenshots/scheduling-lab.png) 路 [LCS 鍔ㄦ€佽鍒抅(screenshots/advanced-lcs.png) 路 [鍥剧畻娉曞疄楠屽彴](screenshots/graph-lab.png) 路 [鐢熸垚鍥惧弬鏁伴潰鏉縘(screenshots/graph-modal-mobile.png) 路 [鐮旂┒鐢熶笓棰榏(screenshots/research-top.png) 路 [鏈€澶ф祦浜や簰](screenshots/research-flow.png)

## 涓€寮犲浘璋憋紝浜斾釜缁忓吀瀹為獙瀹?+ 涓変釜鏂板疄楠屽彴 + 涓€涓笓棰樺眰

| 绫诲瀷 | 椤甸潰 | 鍐呭 | 闅惧害 |
| --- | --- | --- | --- |
| 鎺掑簭涓庨€夋嫨 | [`sorting-lab.html`](sorting-lab.html) | 鍐掓场銆侀€夋嫨銆佹彃鍏ャ€佸笇灏斻€佸綊骞躲€佸揩閫熴€佸爢鎺掑簭銆佽鏁版帓搴?| L1鈥揕3 |
| 鍥句笌缃戠粶 | [`graph-lab.html`](graph-lab.html) | BFS銆丏FS銆丏ijkstra銆丳rim锛汸ageRank 鍦ㄨ繘闃跺疄楠屽 | L1鈥揕4 |
| 鏁版嵁缁撴瀯 | [`structures-lab.html`](structures-lab.html) | BST銆佷簩鍙夊爢銆佸苟鏌ラ泦銆丄VL銆佺孩榛戞爲 | L1鈥揕3 |
| 璋冨害涓庤祫婧愬垎閰?| [`scheduling-lab.html`](scheduling-lab.html) | FCFS銆丼JF銆佷紭鍏堢骇銆佹椂闂寸墖杞浆銆丒DF銆佸鏈?LPT | L1鈥揕4 |
| 绠楁硶鑼冨紡涓庤繘闃?| [`advanced-lab.html`](advanced-lab.html) | LCS銆並MP銆丄ndrew 鍑稿寘銆丳ageRank | L2鈥揕4 |
| 浼樺寲瀹為獙鍙?| [`optimization-lab.html`](optimization-lab.html) | GD銆丮omentum銆丷MSProp銆丄dam锛涗簩缁存崯澶卞湴褰笌杞ㄨ抗 | L2鈥揕3 |
| Transformer 瀹為獙鍙?| [`transformer-lab.html`](transformer-lab.html) | 鐪熷疄 Q/K/V銆佸澶存敞鎰忓姏銆佸洜鏋滄帺鐮併€佽缁熻 | L3鈥揕4 |
| 鍐呭瓨瀹為獙鍙?| [`memory-lab.html`](memory-lab.html) | FIFO / LRU / OPT 椤甸潰缃崲銆佸懡涓巼涓庡抚鐘舵€?| L2 |
| 鍙鍖栫櫨绉?| [`visuals.html`](visuals.html) | 122 涓法 14 涓鍩熺殑瑙嗚绗旇锛岄鍩?闅惧害/鍏抽敭璇嶆绱?| L1鈥揕4 |
| 鐮旂┒鐢熶笓棰?| [`research.html`](research.html) | 鏈€澶ф祦/鏈€灏忓壊銆丩P銆丯P 瀹屽叏鎬с€佽繎浼笺€侀殢鏈恒€佸湪绾匡紱鍚渶澶ф祦浜や簰 | L4 |

## 122 涓彲瑙嗗寲鏍蜂緥

[`visuals.html`](visuals.html) 鐢?14 涓鍩熻鐩栬绠楁満涓撲笟浠庢湰绉戝埌鐮旂┒鐢熺殑姒傚康鍦板浘锛?
- **绠楁硶涓庢暟鎹粨鏋?*锛氫簩鍒嗐€佸搱甯屻€丅FS/DFS銆佹嫇鎵戙€佸苟鏌ラ泦銆乀rie銆佺嚎娈垫爲銆佹爲鐘舵暟缁勩€佸崟璋冩爤銆佹粦鍔ㄧ獥鍙ｃ€丩RU銆佸竷闅嗚繃婊ゅ櫒銆佽烦琛?- **浼樺寲涓庤繍绛?*锛氭搴︿笅闄嶃€丼GD銆佸姩閲忋€丄dam銆佺墰椤挎硶銆佹ā鎷熼€€鐏€侀仐浼犵畻娉曘€佺矑瀛愮兢銆佺嚎鎬ц鍒掋€佸垎鏀畾鐣?- **鏈哄櫒瀛︿範**锛氱嚎鎬?閫昏緫鍥炲綊銆乲NN銆佸喅绛栨爲銆侀殢鏈烘．鏋椼€丟BDT銆丼VM銆並-Means銆丳CA
- **绁炵粡缃戠粶涓?Transformer**锛氭劅鐭ユ満銆丮LP銆佸弽鍚戜紶鎾€丆NN銆丷esNet銆丷NN銆丩STM銆佽嚜缂栫爜鍣ㄣ€丟AN銆佹墿鏁ｃ€佹敞鎰忓姏銆佸澶淬€佷綅缃紪鐮併€乀ransformer 鍧椼€丅ERT銆丟PT
- **鎿嶄綔绯荤粺**锛氳繘绋嬬姸鎬併€佷笂涓嬫枃鍒囨崲銆佺郴缁熻皟鐢ㄣ€佸垎椤点€乀LB銆侀〉闈㈢疆鎹€乮node銆佺鐩樿皟搴︺€佹閿併€佷俊鍙烽噺
- **浣撶郴缁撴瀯涓庢寚浠ら泦**锛欳ISC/RISC銆佹祦姘寸嚎銆佸啋闄┿€佸垎鏀娴嬨€佺紦瀛樺眰娆°€佺粍鐩歌仈銆丮ESI銆丼IMD銆佽皟鐢ㄧ害瀹?- **缃戠粶涓庢嫇鎵?*锛歄SI銆佹槦鍨?鐜瀷/Fat-Tree銆侀摼璺姸鎬併€佽窛绂诲悜閲忋€乀CP 鎻℃墜/鎷ュ銆佹粦鍔ㄧ獥鍙ｃ€丆SMA/CD銆丯AT/瀛愮綉
- **鏁版嵁搴撱€佺紪璇戙€佸垎甯冨紡銆佸畨鍏ㄣ€佸浘褰㈠銆佽绠楃悊璁恒€佽蒋浠跺伐绋?*锛欱+ 鏍戙€佽繛鎺ャ€?PL銆丮VCC銆丩SM銆丏FA銆丄ST銆丼SA銆丟C銆丆AP銆丷aft銆丳axos銆佷竴鑷存€у搱甯屻€丮apReduce銆丄ES銆丷SA銆丏H銆丮erkle銆乀LS/PKI銆乑KP銆丅resenham銆佸厜鏍呭寲銆丅ezier銆佸厜绾胯拷韪€佸浘鐏垫満銆佸仠鏈洪棶棰樸€丟it DAG銆丆I/CD 绛?
姣忎釜鏍蜂緥閮芥湁鐙珛鐨勫皬鍥俱€佹満鍒惰鏄庛€佽瀵熺偣銆佹爣绛句笌寤朵几閾炬帴锛涘崱鐗囧彲灞曞紑涓哄ぇ鍥惧拰瀹屾暣瑙ｉ噴锛屾敮鎸佹繁閾?`#entry-id`銆佷笂涓€寮?涓嬩竴寮犱笌澶嶅埗閾炬帴銆?
闅惧害灞傜骇锛?
- **L1 鏈鍩虹**锛氬叆闂ㄦ暟鎹粨鏋勩€佹瘮杈冩帓搴忋€侀亶鍘嗐€丗CFS/SJF銆?- **L2 鏈杩涢樁**锛氬垎娌汇€佸爢銆佸钩琛℃爲銆佹渶鐭矾銆丷R銆丩CS銆?- **L3 楂橀樁 / 鐮旂┒鐢熷叆闂?*锛氱孩榛戞爲銆佽鏁版帓搴忋€丒DF銆並MP銆佽绠楀嚑浣曘€?- **L4 鐮旂┒鐢?/ 鍗氫竴**锛歅ageRank銆佸鏈?LPT 杩戜技锛屼互鍙婃渶澶ф祦銆丩P銆丯P-瀹屽叏鎬с€佽繎浼?闅忔満/鍦ㄧ嚎绠楁硶绛夌爺绌剁敓涓撻銆?
棣栭〉 [`index.html`](index.html) 浼氭寜銆岀被鍨?脳 闅惧害銆嶅垎缁勫睍绀哄叏閮ㄧ畻娉曪紝鏀寔鎸夌被鍨嬨€侀毦搴︾瓫閫夊拰鍏抽敭璇嶆悳绱€? 涓爺绌剁敓涓撻鏃㈡湁棣栭〉姒傚康鍗★紝涔熸湁 [`research.html`](research.html) 鐨勫畬鏁撮暱鏂囷細妯″瀷銆佸畾鐞嗐€佽瘉鏄庣洿瑙夈€佽嚜娴嬮銆侀槄璇绘潗鏂欍€佸父瑙佽鍖轰笌鍏抽敭鐣岄€熸煡琛ㄣ€?
## 鏁版嵁鐢熸垚鍙傛暟

姣忎釜瀹為獙瀹ら兘鏈夌嫭绔嬬殑娴嬭瘯鏁版嵁闈㈡澘锛涘弬鏁版敼鍙樺悗鍙互閲嶆柊鐢熸垚骞堕噸鏀撅細

| 瀹為獙瀹?| 鍙皟鍙傛暟 |
| --- | --- |
| 鎺掑簭 | 鏁扮粍瑙勬ā 8鈥?4銆侀殢鏈?杩戜箮鏈夊簭/閫嗗簭/灏戦噸澶?閿娇鍒嗗竷銆佸€煎煙涓婇檺銆侀殢鏈虹瀛?|
| 鍥?| 鑺傜偣鏁?6鈥?0銆佺█鐤?閫備腑/瀵嗛泦杈瑰瘑搴︺€佹潈閲嶄笂闄?9/20銆侀殢鏈虹瀛愶紱涔熷彲鍦?3 寮犳墜宸ュ浘涓婂垏鎹?|
| 鏁版嵁缁撴瀯 | 鍒濆鑺傜偣鏁般€侀敭鍊间笂涓嬮檺銆侀殢鏈虹瀛愶紱鍫嗘敮鎸佸€煎煙锛涘苟鏌ラ泦鏀寔鍏冪礌鏁颁笌鍒濆鍚堝苟娆℃暟 |
| 璋冨害 | 浣滀笟鏁般€佸埌杈剧獥鍙ｃ€佹墽琛屾椂闂磋寖鍥淬€佹埅姝㈡湡鏉惧紱鑼冨洿銆佷紭鍏堢骇妗ｄ綅銆佹椂闂寸墖銆佹満鍣ㄦ暟銆侀殢鏈虹瀛?|
| 杩涢樁 | 搴忓垪闀垮害/瀛楁瘝琛ㄣ€佹枃鏈笌妯″紡闀垮害/妞嶅叆鍖归厤銆佺偣闆嗘暟閲?鑼冨洿/褰㈢姸銆佸浘鑺傜偣鏁?杈规鐜?闃诲凹/杩唬闃堝€?|
| 浼樺寲 | 鎹熷け鍑芥暟锛堟き鍦嗙/Rosenbrock/鍚勫悜寮傛€э級銆佷紭鍖栧櫒銆佸涔犵巼銆佽捣鐐癸紙鐐瑰嚮鍦板舰閲嶈锛?|
| Transformer | 娉ㄦ剰鍔涘ご 1鈥?銆佸洜鏋滄帺鐮佸紑鍏炽€佹煡璇?token 宸﹀彸鍒囨崲 |
| 鍐呭瓨 | FIFO/LRU/OPT銆佸抚鏁?2鈥?銆佸紩鐢ㄤ覆闀垮害銆侀殢鏈虹瀛?|

鐢熸垚鍣ㄥ潎浣跨敤甯︾瀛愮殑 PRNG锛堟垨寮曟搸鍐呯殑纭畾鎬ф瀯閫狅級锛屽洜姝ゅ悓涓€缁勫弬鏁板彲浠ュ緱鍒板彲澶嶇幇鐨勫疄楠屾暟鎹€?
## 浜や簰鑳藉姏

- **鎾斁 / 鏆傚仠 / 鍗曟 / 閲嶇疆**锛涙帓搴忋€佹暟鎹粨鏋勪笌杩涢樁瀹為獙瀹ゆ敮鎸侀€熷害鍊嶇巼銆?- **閫愬抚鐘舵€佸彲瑙嗗寲**锛氭煴鐘舵暟缁勩€丼VG 鏍戙€佸爢涓庢．鏋椼€佺敇鐗瑰浘銆丏P 琛ㄣ€佸瓧绗︿覆瀵归綈銆佹暎鐐瑰嚫鍖呫€佹湁鍚戝浘鎺掑悕銆?- **绠楁硶楠ㄦ灦涓庡綋鍓嶈楂樹寒**锛氭瘡涓疄楠屽閮芥湁浼唬鐮併€佹牳蹇冧笉鍙橀噺涓庡鏉傚害璇存槑锛涢暱浠ｇ爜鍧楀唴閮ㄦ粴鍔ㄥ苟鑷姩璺熼殢褰撳墠琛屻€?- **鍙傛暟鍖栧疄楠?*锛氭敮鎸佽瀵熷悓涓€绠楁硶鍦ㄤ笉鍚屾暟鎹垎甯冦€佽妯°€佸瘑搴︺€佹埅姝㈡湡鍘嬪姏銆侀樆灏肩郴鏁颁笅鐨勮涓哄樊寮傘€?- **鍝嶅簲寮忎笌閿洏鎿嶄綔**锛歚Space` 鎾斁/鏆傚仠銆乣鈫抈 鍗曟锛涚獎灞忎繚鐣欐按骞虫粴鍔ㄥ鍣ㄨ€屼笉鏄帇缂╁浘琛ㄣ€?- **鏈€澶ф祦灏忓疄楠?*锛氬湪鐮旂┒鐢熶笓棰樹腑閫愭澧炲箍锛岃瀵熸畫閲忚矾寰勩€佺摱棰堝閲忋€佺疮璁℃祦閲忎笌鏈€缁堟渶灏忓壊銆?- **浼樺寲杞ㄨ抗**锛氬湪浜岀淮鎹熷け鍦板舰涓婃挱鏀?鍗曟锛屾瘮杈?GD銆丮omentum銆丷MSProp銆丄dam 鐨勪笅闄嶈矾寰勩€?- **娉ㄦ剰鍔涚煩闃?*锛氱湡瀹?Q/K/V 璁＄畻銆佸澶村垏鎹€佸洜鏋滄帺鐮佷笌琛屽拰/鐔?杈撳嚭鑼冩暟銆?- **椤甸潰缃崲**锛氶€愭寮曠敤瑙傚療甯х姸鎬併€佸懡涓?缂洪〉涓庢窐姹板喅绛栵紝姣旇緝 FIFO/LRU/OPT銆?
## 鐩綍

```text
index.html                 绠楁硶鍥捐氨棣栭〉锛堢被鍨?脳 闅惧害锛?styles.css                 鍩虹缁撴瀯銆佸浘绠楁硶椤甸潰鏍峰紡涓庣敓鎴愬浘寮瑰眰
atlas.css                  鍥捐氨棣栭〉銆佸叡浜疄楠屽甯冨眬涓庡悇瀹為獙瀹ょ粍浠?claude.css                 鏆栫焊寮犺瑙夌郴缁燂紙瑕嗙洊灞傦紝鏈€鍚庡姞杞斤級
catalog.js                 绠楁硶鐩綍銆侀毦搴﹀厓鏁版嵁涓庣爺绌剁敓涓撻
atlas.js                   棣栭〉绛涢€夈€佹悳绱€佺洰褰曚笌涓撻娓叉煋
lab-core.js                浼唬鐮併€佹挱鏀惧櫒銆佺瀛愪笌婊氬姩绛夊叡浜伐鍏?graph-lab.html             鍥剧畻娉曞疄楠屽彴锛圖ijkstra / BFS / DFS / Prim锛?sorting-lab.html + .js     鎺掑簭瀹為獙瀹?structures-lab.html + .js  鏁版嵁缁撴瀯瀹為獙瀹わ紙BST / 鍫?/ 骞舵煡闆?/ AVL / 绾㈤粦鏍戯級
scheduling-lab.html + .js  璋冨害瀹為獙瀹?advanced-lab.html + .js    杩涢樁瀹為獙瀹わ紙LCS / KMP / 鍑稿寘 / PageRank锛?research.html + research.js 鐮旂┒鐢熶笓棰橀暱鏂?+ 鍙氦浜掓渶澶ф祦
visuals.html               璁＄畻鏈哄彲瑙嗗寲鐧剧锛?22 涓牱渚嬶級
optimization-lab.html      浼樺寲瀹為獙鍙?transformer-lab.html       Transformer / 鑷敞鎰忓姏瀹為獙鍙?memory-lab.html            椤甸潰缃崲瀹為獙鍙?src/visuals/               TypeScript 鏁版嵁銆佹覆鏌撳櫒涓庣櫨绉戜氦浜?src/labs/                  浼樺寲銆佹敞鎰忓姏銆侀〉闈㈢疆鎹㈢殑 TS 浜や簰閫昏緫
public/                    favicon 绛夐潤鎬佽祫婧?vite.config.ts             Vite 澶氶〉闈㈡瀯寤?+ 鏃ч〉闈㈠吋瀹?+ CSS 绾ц仈椤哄簭
vitest.config.ts           TypeScript 鏁版嵁娴嬭瘯
tsconfig.json              涓ユ牸 TypeScript 閰嶇疆
dijkstra.js                Dijkstra 鏍稿績涓庤建杩?graph-algorithms.js        BFS / DFS / Prim 杞ㄨ抗
graphs.js                 鎵嬪伐鍥?+ 甯︾瀛愰殢鏈哄浘鐢熸垚鍣?app.js                     鍥剧畻娉?SVG 娓叉煋銆佹嫋鎷姐€佹挱鏀句笌鐢熸垚鍥惧脊灞?engines/                   sorting / scheduling / tree / advanced / flow 绾畻娉曞紩鎿?build-standalone.js        鐢熸垚鍥剧畻娉曞崟鏂囦欢鐗堬紙鍐呰仈鍩虹鏍峰紡涓庤瑙変富棰橈級
deploy/                    Nginx + Docker Compose
tests/                     Node 鍗曞厓娴嬭瘯銆乂itest 鏁版嵁娴嬭瘯涓?CDP 娴忚鍣ㄦ鏌ヨ剼鏈?.github/                   GitHub Actions CI / Pages
```

## 绠楁硶寮曟搸

鍥惧舰涓庢帶鍒跺眰鍙秷璐瑰紩鎿庝骇鍑虹殑涓嶅彲鍙樿建杩瑰揩鐓э紱绾紩鎿庝篃鍙互鍗曠嫭鍦?Node 鎴栨祻瑙堝櫒涓鐢ㄣ€?
| 寮曟搸 | 鑳藉姏 |
| --- | --- |
| [`engines/sorting-engine.js`](engines/sorting-engine.js) | 8 绉嶆帓搴忋€佸垎甯冪敓鎴愬櫒銆侀€愬抚姣旇緝/浜ゆ崲/璁℃暟蹇収 |
| [`engines/scheduling-engine.js`](engines/scheduling-engine.js) | 6 绉嶈皟搴︾瓥鐣ャ€佷綔涓氱敓鎴愩€佺敇鐗规鏃堕棿鐗囦笌鎸囨爣 |
| [`engines/tree-engine.js`](engines/tree-engine.js) | BST / AVL / 绾㈤粦鏍戞彃鍏ヤ笌鏌ユ壘杞ㄨ抗銆佹棆杞?鏌撹壊浜嬩欢銆佷笉鍙橀噺缁熻 |
| [`engines/advanced-engine.js`](engines/advanced-engine.js) | LCS銆並MP銆丄ndrew 鍑稿寘銆丳ageRank 鍙婂悇鑷暟鎹敓鎴愬櫒 |
| [`engines/flow-engine.js`](engines/flow-engine.js) | Edmonds鈥揔arp 鏈€澶ф祦銆侀€愭澧炲箍蹇収銆佹渶灏忓壊涓庡彲杈鹃泦 |

鏍戝疄楠岃仛鐒︽彃鍏ヤ笌鏌ユ壘锛涙帓搴?璋冨害/鍥?杩涢樁鍧囦负瀹屾暣鍙挱鏀炬祦绋嬨€傛暟鎹粨鏋勭殑鍒犻櫎鎿嶄綔灏氭湭绾冲叆鍙鍖栵紝浣嗗紩鎿庝笌娓叉煋妗嗘灦鍙互缁х画鎵╁睍銆?
## 鏈湴杩愯

棣栨锛?
```powershell
pnpm install
pnpm dev
# 鎵撳紑 Vite 杈撳嚭鐨?http://127.0.0.1:5173/
```

鏃х増缁忓吀椤甸潰浠嶅彲浠ョ洿鎺ュ弻鍑绘墦寮€锛屼絾鏂板鐨勫彲瑙嗗寲鐧剧銆佷紭鍖栥€乀ransformer 涓庡唴瀛樺疄楠屽彴浣跨敤 TypeScript 妯″潡锛岄渶瑕侀€氳繃 Vite 鎴栭潤鎬佹湇鍔″櫒璁块棶銆?
鍥剧畻娉曞崟鏂囦欢鐗堬細[`dijkstra-visualizer.html`](dijkstra-visualizer.html)銆傝鏂囦欢鎶婂浘绠楁硶鎵€闇€ CSS/JavaScript 鍏ㄩ儴鍐呰仈锛岄€傚悎绂荤嚎鍒嗕韩銆?
## 寮€鍙戙€佹祴璇曚笌鏋勫缓

```powershell
pnpm run typecheck  # 涓ユ牸 TypeScript 妫€鏌?pnpm test           # 101 涓?Node 鐢ㄤ緥 + 4 涓?Vitest 鏁版嵁鐢ㄤ緥
pnpm run build      # 鍗曟枃浠跺浘绠楁硶 + Vite 澶氶〉闈㈢敓浜ф瀯寤哄埌 dist/
pnpm run preview    # 棰勮 dist/
```

褰撳墠娴嬭瘯瑕嗙洊锛欴ijkstra/BFS/DFS/Prim銆侀殢鏈哄浘鐢熸垚鍣ㄣ€? 绉嶆帓搴忚建杩广€? 绉嶈皟搴﹀櫒銆丅ST/AVL/绾㈤粦鏍戜笉鍙橀噺銆丩CS/KMP/鍑稿寘/PageRank銆丒dmonds鈥揔arp 涓庢渶灏忓壊銆佷笓棰橀敋鐐广€?22 鏉″彲瑙嗗寲鏁版嵁鐨勫敮涓€鎬?瀹屾暣鎬?閾炬帴鏈夋晥鎬э紝鍏?**105 涓敤渚?*銆?
娴忚鍣ㄦ鏌ヨ剼鏈?`tests/browser-check.mjs` 浣跨敤 Chrome DevTools Protocol锛屾敮鎸佺湡瀹炴挱鏀?鍗曟銆佺Щ鍔ㄧ灏哄銆佹埅鍥惧拰 DOM 鐘舵€佹鏌ワ紱瀹冧笉灞炰簬 `npm test`锛岄渶瑕佸厛鍚姩甯﹁繙绋嬭皟璇曠鍙ｇ殑 Chrome銆?
## 鎶€鏈灦鏋?
- **闈欐€佷紭鍏?*锛氭墍鏈夊彲瑙嗗寲鍦ㄦ祻瑙堝櫒鍐呰繍琛岋紝鐢熶骇浜х墿鏄函闈欐€?`dist/`锛屽彲閮ㄧ讲鍒?Nginx銆丟itHub Pages 鎴栦换鎰?CDN銆?- **Vite + TypeScript**锛氭柊椤甸潰浣跨敤 TS 妯″潡锛涙棫椤甸潰淇濈暀缁忓吀鑴氭湰锛岀敱 Vite 澶氶〉闈㈡瀯寤轰笌鍏煎澶嶅埗灞傞€愭杩佺Щ銆?- **pnpm + CI**锛歚pnpm-lock.yaml` 閿佸畾渚濊禆锛孏itHub Actions 鎵ц typecheck銆?05 涓祴璇曚笌鐢熶骇鏋勫缓锛汸ages 鑷姩閮ㄧ讲鍚屼竴浠?`dist/`銆?- **122 鏉＄被鍨嬪寲鏁版嵁**锛氭墍鏈夊彲瑙嗗寲绗旇鐢?`src/visuals/data` 涓殑绫诲瀷鍖栨潯鐩敓鎴愶紝娓叉煋鍣ㄥ湪 `src/visuals/render.ts`锛屾柊澧炲唴瀹逛笉闇€瑕佸鍒堕〉闈㈡ā鏉裤€?- **鏃犺繍琛屾椂渚濊禆**锛氬浘褰㈠叏閮ㄦ槸鍘熺敓 SVG/DOM锛涙病鏈夊浘琛ㄥ簱銆丆SS 妗嗘灦鎴栧悗绔湇鍔°€?- **CSS 绾ц仈淇濇姢**锛氱敓浜ф瀯寤轰細鎶?`atlas 鈫?claude 鈫?visuals` 鎺掑埌姝ｇ‘椤哄簭锛岄伩鍏嶆棫涓婚瑕嗙洊瑙嗚灞傘€?
褰撳墠娌℃湁鍚庣銆傝处鎴枫€佸涔犺繘搴﹀悓姝ャ€丄I 璁茶В鎴栧唴瀹圭鐞嗙湡姝ｅ嚭鐜伴渶姹傛椂锛屽啀鍔犱竴涓杽 API 鏈嶅姟鍗冲彲锛涗笉寤鸿涓轰簡鈥滃墠鍚庣鍒嗙鈥濇彁鍓嶅紩鍏ユ暟鎹簱涓庨壌鏉冦€?
## 璁捐璇存槑

瑙嗚閲囩敤 Claude 瀹樼綉寮忔殩绾稿紶闃呰鐣岄潰锛氳薄鐗欒壊搴曘€佺櫧鑹插崱鐗囥€佽繎榛戞枃瀛椼€侀櫠鍦熻壊寮鸿皟锛屽睍绀烘爣棰樼敤琛嚎浣擄紝姝ｆ枃浠?16px 宸﹀彸涓轰富锛岃緟鍔╂爣绛句笉浣庝簬 11鈥?2px銆傚師鍏?7鈥?0px 鐨勬祬鐏版爣绛捐鏁翠綋鏇挎崲锛屼唬鐮佸潡銆佸浘绀烘爣绛俱€佽〃鏍间笌绉诲姩绔帶浠朵篃鍚屾鏀惧ぇ骞舵彁楂樺姣斿害銆?
棰滆壊璇箟淇濇寔绋冲畾锛氶紶灏捐崏缁胯〃绀哄凡灏变綅/宸插畬鎴愶紝璧煶琛ㄧず褰撳墠鍔ㄤ綔锛屾绱笌闄跺湡鑹叉爣璁伴珮绾х姸鎬併€傛墍鏈夊浘褰㈢敱鍘熺敓 SVG 鎴?DOM 缁樺埗锛沗claude.css` 鍙鐩栬瑙夛紝涓嶆敼鍙樹笟鍔＄被鍚嶆垨 SVG 缁撴瀯銆?
## 閮ㄧ讲

鏈嶅姟鍣ㄧ洰褰曠害瀹氥€侀暅鍍忋€佸彧璇绘牴鏂囦欢绯荤粺銆佸仴搴锋鏌ャ€佹洿鏂颁笌鍥炴粴姝ラ瑙?[`deploy/README.md`](deploy/README.md)銆傜敓浜ч儴缃蹭娇鐢?`pnpm run build` 鐢熸垚鐨?`dist/`銆傚綋鍓嶇嚎涓婂湴鍧€涓猴細

- Atlas锛?http://154.222.16.237:9000/>
- GitHub Pages锛?https://zfqxuz.github.io/algorithm-atlas/>
- 鍙鍖栫櫨绉戯細<http://154.222.16.237:9000/visuals.html>
- 浼樺寲瀹為獙鍙帮細<http://154.222.16.237:9000/optimization-lab.html>
- Transformer 瀹為獙鍙帮細<http://154.222.16.237:9000/transformer-lab.html>
- 鍐呭瓨瀹為獙鍙帮細<http://154.222.16.237:9000/memory-lab.html>
- 鍥剧畻娉曞疄楠屽彴锛?http://154.222.16.237:9000/graph-lab.html>
- 鐮旂┒鐢熶笓棰橈細<http://154.222.16.237:9000/research.html>
- 鍗曟枃浠跺浘绠楁硶锛?http://154.222.16.237:9000/dijkstra-visualizer.html>
- 鍋ュ悍妫€鏌ワ細<http://154.222.16.237:9000/healthz>

## License

MIT 漏 2026 zfqxuz. See [`LICENSE`](LICENSE).

Issues and pull requests are welcome; see [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`ROADMAP.md`](ROADMAP.md).
