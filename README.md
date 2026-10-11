# dsh-code-highlight

[English](README.en.md) | **涓枃**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![DSH plugin](https://img.shields.io/badge/DSH-plugin-4B6BFB.svg)](#瀹夎)

涓?*鎶ュ憡绫绘枃妗?*鎻愪緵浠ｇ爜璇硶楂樹寒鐨?DeepSeek Harness锛圖SH锛夋彃浠躲€傛敞鍐屼竴涓?`highlight_code` 宸ュ叿锛?鎶婁唬鐮佺墖娈垫覆鏌撴垚甯︾湡瀹炶娉曢厤鑹茬殑浜х墿锛岃惤鍒?Markdown / HTML銆乄ord銆丳owerPoint銆丳DF 涓?LaTeX 閲屻€?
<p align="center">
  <img src="examples/doc-figure.png" alt="6.3 鑻卞瀹姐€?00 dpi 鐨勯珮浜唬鐮佸浘" width="760">
</p>

## 鐗规€?
- **68 绉嶈瑷€** 鈥斺€?鎸夎瑷€鍚嶃€佸埆鍚嶆垨鏂囦欢鎵╁睍鍚嶈В鏋愶紱娌℃湁缁欏畾璇█鏃舵寜鍐呭鑷姩璇嗗埆锛岃瘑鍒笉鍑哄氨鑰佸疄鎸夌函鏂囨湰澶勭悊銆?- **10 绉嶈緭鍑?* 鈥斺€?`html`銆乣html-file`銆乣svg`銆乣svg-png`銆乣png`銆乣latex`銆乣latex-minted`銆乣markdown`銆乣ansi`銆乣text`銆?- **7 濂椾富棰?* 鈥斺€?`paper-light`锛堟枃妗ｅ悜锛夈€乣github-dark`銆乣github-light`銆乣one-dark`銆乣monokai`銆乣solarized-light`銆乣solarized-dark`锛屽彟鏈?`auto`銆?- **鐭㈤噺涓庝綅鍥惧叡鐢ㄤ竴濂楀嚑浣?* 鈥斺€?SVG 涓?PNG 鐢卞悓涓€涓竷灞€妯″瀷浜у嚭锛岀墿鐞嗗昂瀵镐笌閫愭牸浣嶇疆涓€鑷淬€?- **闈㈠悜鏂囨。鐨勬帓鐗堝弬鏁?* 鈥斺€?`width_in`銆乣dpi`銆乣font_size_pt`銆乣line_height`銆乣show_title`锛岀洿鎺ヤ骇鍑鸿兘璐磋繘 Word 涓€椤靛鐨勫浘銆?- **鐩存帴钀界洏** 鈥斺€?缁欏嚭 `output_file` 灏卞啓鏂囦欢骞惰繑鍥炶矾寰勶紝涓嶅啀鎶婇暱鏂囧洖浼犵粰妯″瀷銆?- **涓嶉渶瑕佹祻瑙堝櫒锛屼篃涓嶉渶瑕?Office** 鈥斺€?PNG 鐢卞唴缃殑 Pillow 鏍呮牸鍖栧櫒缁樺埗锛屼腑鏂囦笌 ASCII 鍦ㄥ浐瀹氭杩涚綉鏍间笂瀵归綈銆?- **闆惰繍琛屾椂 npm 渚濊禆** 鈥斺€?鍒嗚瘝鍣ㄤ笌娓叉煋鍣ㄥ叏閮ㄨ嚜甯︼紝绂荤嚎鍙敤銆?
## 瀹夎

### 浣滀负 DSH 鎻掍欢

鍦?DSH 浼氳瘽涓皟鐢?`plugin_manager`锛?
```
action: install_bundle
target: <鏈粨搴撶殑缁濆璺緞>
```

鍖呭唴 `cordis.patch.yml` 浼氭彃鍏ヤ竴琛屾彃浠舵潯鐩紱瀹夎鍚?`highlight_code` 瀵瑰綋鍓?profile 鐨勬墍鏈変細璇濆彲鐢ㄣ€?淇敼婧愮爜鍚庨渶瑕侀噸鍚?DSH 鎵嶄細鍔犺浇鏂版ā鍧椼€?
### 渚涘叾浠栭」鐩洿鎺ュ紩鐢?
```bash
git clone https://github.com/scientificmaniac/dsh-code-highlight.git
cd dsh-code-highlight
npm test
```

`index.js` 瀵煎嚭 DSH 鎻掍欢鐨?`apply` / `inject` / `name`锛涜嫢鍙兂鐢ㄦ覆鏌撹兘鍔涳紝鍙洿鎺ュ紩鐢?`src/` 涓嬬殑妯″潡锛?
```js
import { resolveLanguage } from 'dsh-code-highlight/src/languages.js';
import { tokenizeLines } from 'dsh-code-highlight/src/tokenize.js';
import { resolveTheme } from 'dsh-code-highlight/src/themes.js';
import { renderHtml } from 'dsh-code-highlight/src/render.js';
```

## 鐢ㄦ硶

| 鍙傛暟 | 璇存槑 |
| --- | --- |
| `code`锛堝繀濉級 | 瑕侀珮浜殑婧愮爜锛涘厑璁告暣娈佃 Markdown 鍥存爮鍖呬綇銆?|
| `language` | 璇█ id銆佸埆鍚嶆垨鎵╁睍鍚嶏紝濡?`python`銆乣py`銆乣ts`銆乣c++`銆乣bash`銆乣sql`銆乣latex`銆傜渷鐣ュ垯鑷姩璇嗗埆銆?|
| `format` | 杈撳嚭鏍煎紡锛岄粯璁?`html`銆?|
| `theme` | 涓婚 id 鎴?`auto`銆傛姤鍛婃帓鐗堟帹鑽?`paper-light`銆?|
| `dark` | 浠?`theme: "auto"` 鏃剁敓鏁堢殑鏄庢殫鍋忓ソ锛岄粯璁ゆ繁鑹层€?|
| `title` | 浠ｇ爜鍧楁爣绛撅紝閫氬父鏄枃浠跺悕鎴栫墖娈电敤閫斻€?|
| `show_title` | 鏄惁鏄剧ず `title`锛岄粯璁?`true`锛涜 `false` 鍙交搴曞幓鎺夋枃浠跺悕銆?|
| `document_title` | 浠?`html-file` 鐢ㄧ殑鏂囨。鏍囬锛岄粯璁や笉杈撳嚭锛屽洜姝ゆ枃浠跺悕涓嶄細鍙樻垚鏂囨。鏍囬銆?|
| `line_numbers` | 鏄惁鏄剧ず琛屽彿鍒楋紝榛樿 `true`銆?|
| `start_line` | 棣栬琛屽彿锛岄粯璁?`1`锛岀敤浜庣墖娈垫憳褰曘€?|
| `highlight_lines` | 闇€瑕佸己璋冪殑琛岋紝濡?`"3,7-9"`銆?|
| `font_size` | 浠ｇ爜瀛楀彿锛圕SS 鍍忕礌锛夛紝榛樿 `13`銆?|
| `font_size_pt` | 浠ｇ爜瀛楀彿锛堢锛夛紝浼樺厛浜?`font_size`锛? pt = 4/3 px銆?|
| `line_height` | 琛岃窛鍊嶆暟锛岄粯璁?`1.5`锛涗綆浜?1.3 鏃朵腑鏂囧彲鑳借创杩戜笅涓€琛屻€?|
| `tab_size` | 鍒惰〃绗﹀睍寮€瀹藉害锛岄粯璁?`4`銆?|
| `canvas` | 鐩爣鐢诲竷灏哄锛屽 `"960x540"`銆傝缃悗 `svg` 杈撳嚭涓烘暣椤靛昂瀵搞€佷唬鐮佸潡灞呬腑缂╂斁锛屽彲鐩存帴浜ょ粰 `univer_compile_svg`銆?|
| `width_in` | 鐗╃悊瀹藉害锛堣嫳瀵革級锛屽 `6.3`銆侾NG 鍍忕礌瀹?= `width_in 脳 dpi`锛孲VG 寰楀埌绛変环鐨?`width="鈥n"`銆?|
| `dpi` | 浣嶅浘鍒嗚鲸鐜囷紝榛樿 `300`锛涜鍊煎啓鍏?PNG锛學ord 鎹鎹㈢畻瀹為檯灏哄銆?|
| `output_file` | 鍐欏叆姝よ矾寰勫苟杩斿洖璺緞锛涚浉瀵硅矾寰勫熀浜庝細璇濆伐浣滃尯銆俙png` 涓?`svg-png` 蹇呭～銆?|
| `overwrite` | 鍏佽瑕嗙洊宸插瓨鍦ㄦ枃浠讹紝榛樿 `false`銆?|
| `mono_font` | 鏍呮牸鍖?ASCII 鐢ㄧ殑瀛椾綋鏂囦欢锛屽 `consola.ttf`銆?|
| `cjk_font` | 鏍呮牸鍖栦腑鏃ラ煩绛夊瀛楃鐢ㄧ殑瀛椾綋鏂囦欢锛屽 `msyh.ttc`銆乣simsun.ttc`銆?|

### 鏍煎紡涓庤惤鐐?
| `format` | 浜х墿 | 鍏稿瀷钀界偣 |
| --- | --- | --- |
| `html` | 鍏ㄥ唴鑱旀牱寮忕殑 HTML 鐗囨 | Markdown 鎶ュ憡銆丠TML 鎶ュ憡銆侀偖浠躲€佸彲绮樿创鐨勫瘜鏂囨湰 |
| `html-file` | 瀹屾暣鐙珛 HTML 鏂囨。 | 娴忚鍣ㄦ墦寮€銆佹墦鍗版垚 PDF |
| `svg` | 鐭㈤噺浠ｇ爜鍥撅紙鍙姞 `width_in` 瀹氬锛?| Word / PPT / PDF 鎻掑浘锛涗篃鍙氦缁?`univer_compile_svg` |
| `svg-png` | 鍚岀増寮忕殑 `.svg` + `.png` 涓€瀵规枃浠?| 鏂囨。闇€瑕佺煝閲忓浘涓庝綅鍥惧厹搴曟椂 |
| `png` | Pillow 鏍呮牸鍖栫殑浣嶅浘锛屽惈 DPI 鍏冩暟鎹?| 鏃?SVG 鏀寔鐨勭紪杈戝櫒銆丳DF 鎺掔増銆佸揩閫熼瑙?|
| `latex` | `listings` 鐜 | `.tex` 鎶ュ憡锛坧dfLaTeX / XeLaTeX 閫氱敤锛屾棤闇€ shell-escape锛?|
| `latex-minted` | `minted` 鐜 | 闇€瑕?`-shell-escape` 鐨?`.tex` |
| `markdown` | 鍥存爮浠ｇ爜鍧?| 浜ょ粰涓嬫父 Markdown 娓叉煋鍣ㄨ嚜琛岀潃鑹?|
| `ansi` | 24 浣嶈壊缁堢鏂囨湰 | 缁堢銆佹棩蹇?|
| `text` | 鍘熸牱浠ｇ爜 | 绾枃鏈?|

### 鍚勬姤鍛婃牸寮忕殑钀藉湴娴佺▼

- **Markdown / HTML** 鈥斺€?`format: html`锛屾妸杩斿洖鐗囨鍐欒繘鎶ュ憡銆?- **Word锛?docx锛?* 鈥斺€?`format: svg-png` + `width_in: 6.3`锛屾彃鍏ュ畾瀹界煝閲忓浘锛屾垨浣跨敤鍚屽昂瀵?PNG銆?- **PDF** 鈥斺€?`format: png` 鐩存帴鎺掔増锛屾垨 `format: latex` 鐢?LaTeX 鎺掔増銆乣html-file` 鎵撳嵃銆?- **LaTeX / PDF 璁烘枃** 鈥斺€?`format: latex`锛坄listings`锛夋垨 `format: latex-minted`銆?- **PowerPoint** 鈥斺€?`format: svg` + `canvas: "960x540"`锛屽啀鐢?`univer_compile_svg` 缂栬瘧鍒板够鐏墖椤点€?
## 鏍呮牸鍖栵細涓轰粈涔堜腑鏂囪兘瀵归綈

SVG 涓?PNG 鍏辩敤**鍥哄畾姝ヨ繘缃戞牸**锛氫竴涓?ASCII 鍗曞厓鏍煎浐瀹氫负 `0.6 脳 瀛楀彿`锛孋JK 涓?emoji 鍗犱袱涓崟鍏冩牸銆?鎺掔増鍥犳鍙敱鍑犱綍鍐冲畾锛屼笉渚濊禆娴忚鍣ㄦ垨 Pillow 鍚勮嚜鐨勫瓧浣撳害閲忋€?
PNG 缁樺埗鏃舵寜瀛楃閫夊瓧浣擄細ASCII 璧扮瓑瀹藉瓧浣擄紙榛樿 Consolas锛夛紝瀹藉瓧绗﹁蛋 CJK 瀛椾綋锛堥粯璁ゅ井杞泤榛戯級锛?涓よ€呰惤鍦ㄥ悓涓€缃戞牸璧风偣涓娾€斺€旇繖灏辨槸銆孋onsolas 鐢?ASCII + 涓枃瀛椾綋鐢讳腑鏂囥€嶈€屼笉璁╃缉杩涜蛋鏍风殑鍋氭硶銆?瀛椾綋鍙敤 `mono_font` / `cjk_font` 瑕嗙洊銆?
鏍呮牸鍖栦緷璧?**Python 3 + Pillow**銆傝剼鏈互 `stdio: ignore` 鍚姩銆佽瘖鏂粡涓存椂鏂囦欢鍥炰紶锛?鍥犳鍦ㄧ姝㈡崟鑾风閬撶殑鍙楅檺鐜閲屽悓鏍峰彲鐢ㄣ€傝В閲婂櫒鎸?`python`銆乣py`銆乣python3` 渚濇灏濊瘯锛?涔熷彲鐢ㄧ幆澧冨彉閲?`DSH_CODE_HIGHLIGHT_PYTHON` 鎸囧畾銆?
## 椤圭洰缁撴瀯

```
.
鈹溾攢鈹€ index.js              # 鎻掍欢鍏ュ彛锛氬伐鍏峰畾涔夈€佸弬鏁拌В鏋愩€佹牸寮忓垎娲俱€佽惤鐩樹笌鏍呮牸鍖栬皟鐢?鈹溾攢鈹€ src/
鈹?  鈹溾攢鈹€ languages.js      # 68 绉嶈瑷€鐨勮瘝娉曞畾涔夎〃
鈹?  鈹溾攢鈹€ detect.js         # 璇█鑷姩璇嗗埆锛堢壒寰佹墦鍒嗭級
鈹?  鈹溾攢鈹€ tokenize.js       # 閫氱敤鍒嗚瘝鍣?+ 鍚勪笓鐢ㄦ壂鎻忔ā寮?鈹?  鈹溾攢鈹€ themes.js         # 7 濂椾富棰橀厤鑹?鈹?  鈹斺攢鈹€ render.js         # HTML / SVG / LaTeX / ANSI / Markdown 娓叉煋鍣ㄤ笌鍏辩敤鍑犱綍
鈹溾攢鈹€ py/rasterize.py       # Pillow 鏍呮牸鍖栧櫒锛堝悓涓€缃戞牸妯″瀷锛?鈹溾攢鈹€ tests/smoke.mjs       # 112 椤规柇瑷€锛氬垎璇嶄笉鍙樺紡銆佹覆鏌撶煩闃点€佽瘑鍒€佹帓鐗堝嚑浣?鈹溾攢鈹€ tests/rasterize.mjs   # PNG 閾捐矾娴嬭瘯锛堥渶瑕?Python + Pillow锛?鈹溾攢鈹€ scripts/              # 绀轰緥浜х墿鐢熸垚鑴氭湰
鈹溾攢鈹€ examples/             # 绀轰緥浜х墿
鈹溾攢鈹€ locale/{zh,en}.json   # 鎻掍欢鍗＄墖鏂囨
鈹斺攢鈹€ cordis.patch.yml      # DSH bundle 娓呭崟
```

## 寮€鍙?
```bash
npm test                                  # 鍐掔儫娴嬭瘯锛堟棤闇€ Python锛?npm run test:raster                       # PNG 閾捐矾娴嬭瘯锛堥渶瑕?Python 3 + Pillow锛?node scripts/make-doc-figure.mjs          # 鐢熸垚閰嶅鐨?SVG + PNG 鏂囨。鎻掑浘
```

`npm test` 瑕嗙洊鍒嗚瘝寰€杩斾笉鍙樺紡锛?8 绉嶈瑷€ 脳 鍘嬪姏鏍锋湰锛岃緭鍑烘嫾鍥炲繀椤荤瓑浜庤緭鍏ワ級銆?娓叉煋鐭╅樀锛堣瑷€ 脳 涓婚 脳 鏍煎紡锛夈€佽瑷€鑷姩璇嗗埆銆佺敾甯冧笌鑻卞鎺掔増銆乣show_title` 鍘婚噸涓?CJK 鍙屾牸瀹藉害銆?璇︾粏鎶ュ憡鍐欏叆 `smoke-report.txt`銆?
## 璇█涓€瑙?
閫氱敤缂栫▼璇█锛欽avaScript銆乀ypeScript銆丳ython銆丣ava銆並otlin銆丼cala銆丟roovy銆丆銆丆++銆丆#銆丟o銆丷ust銆丼wift銆?Ruby銆丳HP銆丳erl銆丩ua銆丷銆丮ATLAB銆丣ulia銆丏art銆丒lixir銆丒rlang銆丠askell銆丆lojure銆丩isp銆丗#銆乂isual Basic銆?Pascal銆丗ortran銆丄ssembly銆丆OBOL銆丼olidity銆乂erilog銆丟LSL銆丟DScript銆丄pex銆乑ig銆丯im銆丱Caml銆丳owerShell銆?Shell銆丗ish銆丅atch銆乂im Script銆丄WK銆?
閰嶇疆涓庢暟鎹細JSON銆乊AML銆乀OML銆両NI / properties / dotenv銆乆ML銆丠TML銆丆SS / SCSS / LESS銆丮arkdown銆?Dockerfile銆丮akefile / CMake銆丯ginx銆丠TTP銆丳rotocol Buffers銆丟raphQL銆乀erraform / HCL銆丯ix銆丮ermaid銆?CSV / TSV銆丏iff / Patch銆丩aTeX銆佺函鏂囨湰銆?
## 宸茬煡闄愬埗

- 涓€娆″鐞嗕竴涓唬鐮佺墖娈碉紱涓嶅仛鏁寸瘒鎶ュ憡鐨勬壒閲忔壂鎻忋€?- `width_in` 鍙妸鍥剧缉鍒版爮瀹戒互鍐咃紝涓嶄細鎶婄煭鐗囨鏀惧ぇ鍒版濂戒竴椤靛銆?- HTML 涓唴宓岀殑 `<script>` / `<style>` 鍐呭涓嶅崟鐙潃鑹层€?- 瀹藉瓧绗︿竴寰嬫寜涓ゆ牸璁＄畻锛涗釜鍒粓绔?emoji 鐨勫疄闄呭搴﹀彲鑳界暐鏈夊嚭鍏ャ€?- `format: markdown` 杈撳嚭鐨勬槸鍥存爮鍧楋紝鐫€鑹茬敱涓嬫父 Markdown 娓叉煋鍣ㄥ畬鎴愶紝涓庢湰鎻掍欢鐨勯厤鑹叉棤鍏炽€?- 淇敼鎻掍欢婧愮爜鍚庯紝杩愯涓殑浼氳瘽浠嶄娇鐢ㄥ凡鍔犺浇鐨勬ā鍧楋紱鏂颁唬鐮佸湪 DSH 閲嶅惎鍚庣敓鏁堛€?
## 璐＄尞

娆㈣繋鎻?Issue 涓?PR锛岃瑙?[CONTRIBUTING.md](CONTRIBUTING.md)銆?
## 璁稿彲璇?
[MIT](LICENSE)銆?