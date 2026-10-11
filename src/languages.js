/**
 * 语言定义表：把语言名、别名或文件扩展名解析成一份语法定义，供通用分词器复用。
 * 纯数据模块，零外部依赖，Node 与浏览器都可加载。
 *
 * 每个定义由通用分词器解释，`mode` 决定走哪条专用扫描路径：
 *   code      —— 类 C / 类 Python 的通用词法（注释 + 字符串 + 关键字 + 数字 + 标识符）
 *   markup    —— HTML / XML 一类的标签语言
 *   css       —— CSS / SCSS / LESS
 *   json      —— JSON / JSONC
 *   yaml      —— YAML
 *   markdown  —— Markdown
 *   diff      —— 补丁文本
 *   ini       —— INI / properties / dotenv
 *   makefile  —— Makefile / CMake
 *   latex     —— TeX 源码
 *   csv       —— 分隔符表格
 *   plain     —— 不高亮
 */

/** 把空白分隔的关键字串编译成查找集合，空值返回 null；`ci` 为真时统一转小写。 */
function words(value, ci) {
  if (!value) return null;
  const parts = value.trim().split(/\s+/);
  return new Set(ci ? parts.map((part) => part.toLowerCase()) : parts);
}

/**
 * 归一化一条字符串字面量声明。
 * 支持三种写法：`'"'`、`['"""', { multi: true }]`、`['r#"', { to: '"#' }]`。
 */
function normString(entry) {
  if (typeof entry === 'string') return { o: entry, c: entry, esc: '\\', multi: false };
  const [open, options] = entry;
  const opts = options || {};
  let close = open;
  if (opts.to !== undefined) close = opts.to;
  else if (opts.c !== undefined) close = opts.c;
  return {
    o: open,
    c: close,
    esc: opts.esc === undefined ? '\\' : opts.esc,
    multi: !!opts.multi,
  };
}

/** 定义一个语言。 */
function lang(id, name, options) {
  const o = options || {};
  const ci = !!o.ci;
  const strings = (o.str || ['"', "'"])
    .map(normString)
    .sort((a, b) => b.o.length - a.o.length);
  return {
    id,
    name,
    aliases: o.a || [],
    ext: o.e || [],
    mode: o.mode || 'code',
    ci,
    line: o.line || [],
    block: o.block || [],
    str: strings,
    kw: words(o.kw, ci),
    types: words(o.t, ci),
    builtins: words(o.b, ci),
    consts: words(o.c, ci),
    pre: o.pre || null,
    decorator: o.decorator || null,
    attr: o.attr || null,
    heredoc: !!o.heredoc,
    vars: o.vars || [],
    label: o.label || null,
    fnKeys: o.fn !== false,
  };
}

/* ------------------------------------------------------------------ *
 * 通用编程语言
 * ------------------------------------------------------------------ */

const CODE_LANGUAGES = [
  lang('javascript', 'JavaScript', {
    a: ['js', 'jsx', 'mjs', 'cjs', 'node'],
    e: ['js', 'jsx', 'mjs', 'cjs'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['`', { multi: true }]],
    kw: 'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield using',
    t: 'Array ArrayBuffer BigInt Boolean Date Error Function JSON Map Math Number Object Promise Proxy Reflect RegExp Set String Symbol WeakMap WeakSet Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array BigInt64Array BigUint64Array',
    b: 'console window document globalThis process require module exports fetch setTimeout setInterval clearTimeout clearInterval queueMicrotask structuredClone parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent',
    c: 'true false null undefined NaN Infinity',
    decorator: '@',
  }),
  lang('typescript', 'TypeScript', {
    a: ['ts', 'tsx', 'mts', 'cts'],
    e: ['ts', 'tsx', 'mts', 'cts'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['`', { multi: true }]],
    kw: 'abstract any as asserts async await bigint boolean break case catch class const constructor continue declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let namespace never new number object of override private protected public readonly return satisfies set static string super switch symbol this throw try type typeof undefined unique unknown var void while yield',
    t: 'Array ArrayLike Boolean Date Error Function Map Number Object Promise Readonly Record RegExp Set String Symbol Tuple WeakMap WeakSet Partial Required Pick Omit Exclude Extract NonNullable ReturnType Parameters Awaited Uint8Array',
    b: 'console JSON Math process setTimeout',
    c: 'true false null undefined NaN Infinity',
    decorator: '@',
  }),
  lang('python', 'Python', {
    a: ['py', 'pyi', 'pyw', 'python3'],
    e: ['py', 'pyw', 'pyi'],
    line: ['#'],
    str: ['"', "'", ['"""', { multi: true }], ["'''", { multi: true }]],
    kw: 'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield',
    t: 'bool bytes bytearray complex dict float frozenset int list object set str tuple type memoryview',
    b: 'abs all any ascii bin breakpoint callable chr classmethod compile delattr dir divmod enumerate eval exec filter format getattr globals hasattr hash help hex id input isinstance issubclass iter len locals map max min next oct open ord pow print property range repr reversed round setattr slice sorted staticmethod sum super vars zip __import__ self cls',
    c: 'True False None NotImplemented Ellipsis',
    decorator: '@',
  }),
  lang('java', 'Java', {
    a: ['java'],
    e: ['java'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'"],
    kw: 'abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return sealed static strictfp super switch synchronized this throw throws transient try var volatile while yield record permits non-sealed',
    t: 'boolean byte char double float int long short void String Object Integer Long Double Float Boolean Character Byte Short List Map Set ArrayList HashMap HashSet Optional Stream Collectors LocalDate LocalDateTime Duration Instant',
    b: 'System Math Objects Arrays Collections Stream String Thread Exception RuntimeException Override Deprecated',
    c: 'true false null',
    decorator: '@',
  }),
  lang('kotlin', 'Kotlin', {
    a: ['kt', 'kts'],
    e: ['kt', 'kts'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['"""', { multi: true }]],
    kw: 'abstract actual annotation as break by catch class companion const constructor continue crossinline data delegate do dynamic else enum expect external final finally for fun get if import in infix init inline inner interface internal is lateinit noinline object open operator out override package private protected public reified return sealed set super suspend tailrec this throw try typealias typeof val var vararg when where while',
    t: 'Any Array Boolean Byte Char CharSequence Double Float Int List Long Map MutableList MutableMap Nothing Number Pair Set Short String Triple Unit',
    b: 'println print listOf mapOf setOf mutableListOf require check lazy also apply let run with',
    c: 'true false null',
    decorator: '@',
  }),
  lang('scala', 'Scala', {
    a: ['scala', 'sc'],
    e: ['scala', 'sc'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', ['"""', { multi: true }]],
    kw: 'abstract case catch class def do else extends final finally for forSome if implicit import lazy match new object override package private protected return sealed super this throw trait try type val var while with yield given enum export then using',
    t: 'Any AnyRef AnyVal Array Boolean Byte Char Double Float Int List Long Map Nothing Option Seq Set Short String Unit Vector Future Either Try',
    b: 'println print require assert Some None',
    c: 'true false null',
    decorator: '@',
  }),
  lang('groovy', 'Groovy', {
    a: ['groovy', 'gradle'],
    e: ['groovy', 'gradle', 'gvy'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['"""', { multi: true }], ["'''", { multi: true }]],
    kw: 'abstract as assert break case catch class const continue def default do else enum extends final finally for goto if implements import in instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws trait transient try var void volatile while',
    t: 'boolean byte char double float int long short String Object List Map Set Closure',
    b: 'println printf each collect findAll inject',
    c: 'true false null',
    decorator: '@',
  }),
  lang('c', 'C', {
    a: ['c', 'h'],
    e: ['c', 'h'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'"],
    kw: 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while _Bool _Complex _Atomic _Generic _Static_assert _Thread_local',
    t: 'char double float int long short signed unsigned void size_t ssize_t ptrdiff_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t FILE va_list bool',
    b: 'printf fprintf sprintf snprintf scanf malloc calloc realloc free memcpy memmove memset strlen strcmp strcpy strncpy strcat fopen fclose fread fwrite fseek ftell exit abort assert NULL',
    c: 'NULL true false',
    pre: '#',
  }),
  lang('cpp', 'C++', {
    a: ['cpp', 'c++', 'cxx', 'cc', 'hpp', 'hxx', 'hh', 'c++11'],
    e: ['cpp', 'cxx', 'cc', 'c++', 'hpp', 'hxx', 'hh', 'ipp'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['R"', { esc: null, to: '"' }]],
    kw: 'alignas alignof and asm auto bitand bitor bool break case catch char class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false final float for friend goto if inline int long mutable namespace new noexcept not nullptr operator or override private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor',
    t: 'std string string_view vector map unordered_map set unordered_set list array deque queue stack pair tuple shared_ptr unique_ptr weak_ptr optional variant any function thread mutex atomic chrono istream ostream ifstream ofstream stringstream',
    b: 'std cout cin cerr endl printf malloc free memcpy memset sizeof move forward make_shared make_unique static_cast dynamic_cast',
    c: 'true false nullptr NULL',
    pre: '#',
  }),
  lang('csharp', 'C#', {
    a: ['cs', 'csharp', 'csx'],
    e: ['cs', 'csx'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['@"', { esc: null, to: '"' }], ['"""', { multi: true }]],
    kw: 'abstract as async await base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach get goto if implicit in init interface internal is lock namespace new operator out override params partial private protected public readonly record ref return sealed set sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using var virtual void volatile when where while with yield global required file',
    t: 'bool byte char decimal double dynamic float int long nint nuint object sbyte short string uint ulong ushort void Task ValueTask List Dictionary IEnumerable IQueryable Span Memory Exception',
    b: 'Console Math String Convert Enumerable Task Linq DateTime Guid StringBuilder',
    c: 'true false null',
    attr: '[',
    decorator: '@',
  }),
  lang('go', 'Go', {
    a: ['go', 'golang'],
    e: ['go'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['`', { esc: null, multi: true }]],
    kw: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var',
    t: 'bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any comparable',
    b: 'append cap close complex copy delete imag len make new panic print println real recover fmt errors strings strconv time context sync os io sort',
    c: 'true false nil iota',
  }),
  lang('rust', 'Rust', {
    a: ['rs', 'rust'],
    e: ['rs'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['r#"', { esc: null, to: '"#' }], ['r"', { esc: null, to: '"' }]],
    kw: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while yield macro_rules',
    t: 'bool char f32 f64 i8 i16 i32 i64 i128 isize str String u8 u16 u32 u64 u128 usize Vec Option Result Box Rc Arc RefCell Cell HashMap HashSet BTreeMap Cow',
    b: 'println print format vec panic assert assert_eq unimplemented todo dbg Some None Ok Err',
    c: 'true false None Ok Err',
    attr: '#',
    decorator: '@',
  }),
  lang('swift', 'Swift', {
    a: ['swift'],
    e: ['swift'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', ['"""', { multi: true }]],
    kw: 'actor any as associatedtype async await break case catch class continue convenience default defer deinit didSet do else enum extension fallthrough fileprivate final for func get guard if import in indirect init inout internal is lazy let mutating nonisolated open operator optional override package precedencegroup private protocol public repeat required rethrows return self Self set some static struct subscript super switch throw throws try typealias var weak where while willSet',
    t: 'Any AnyObject Array Bool Character Data Dictionary Double Error Float Int Int8 Int16 Int32 Int64 Optional Result Set String UInt URL UUID Void Task',
    b: 'print debugPrint assert precondition fatalError min max abs map filter reduce',
    c: 'true false nil',
    decorator: '@',
  }),
  lang('ruby', 'Ruby', {
    a: ['rb', 'ruby'],
    e: ['rb', 'rake', 'gemspec'],
    line: ['#'], block: [['=begin', '=end']],
    str: ['"', "'", ['%w(', { esc: null, to: ')' }]],
    kw: 'alias and begin break case class def defined? do else elsif end ensure for if in module next nil not or redo rescue retry return self super then undef unless until when while yield lambda proc require require_relative attr_accessor attr_reader attr_writer include extend prepend private protected public',
    t: 'Array Hash String Integer Float Symbol Range Proc Struct Module Class IO File Time',
    b: 'puts print p gets new raise loop each map select reject reduce freeze format',
    c: 'true false nil',
    vars: ['@', '$'],
    heredoc: true,
  }),
  lang('php', 'PHP', {
    a: ['php', 'php3', 'php4', 'php5', 'phtml'],
    e: ['php', 'phtml', 'php3', 'php4', 'php5', 'phps'],
    line: ['//', '#'], block: [['/*', '*/']],
    str: ['"', "'"],
    kw: 'abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield',
    t: 'bool int float string array object mixed void never iterable self static parent',
    b: 'strlen count array_map array_filter implode explode sprintf printf json_encode json_decode var_dump print_r preg_match preg_replace',
    c: 'true false null TRUE FALSE NULL',
    vars: ['$'],
  }),
  lang('perl', 'Perl', {
    a: ['perl', 'pl', 'pm', 't'],
    e: ['pl', 'pm', 't'],
    line: ['#'],
    str: ['"', "'", ['`', { multi: true }]],
    kw: 'my our local sub use package require if elsif else unless while until for foreach do return last next redo goto die warn eval print printf say chomp chop split join map grep sort keys values each push pop shift unshift splice exists delete defined undef ref bless new scalar wantarray',
    t: 'ARRAY HASH SCALAR CODE GLOB REF',
    b: 'print printf say open close read write length substr index sprintf',
    c: 'undef',
    vars: ['$', '@', '%', '&'],
  }),
  lang('lua', 'Lua', {
    a: ['lua'],
    e: ['lua'],
    line: ['--'], block: [['--[[', ']]']],
    str: ['"', "'", ['[[', { esc: null, to: ']]', multi: true }]],
    kw: 'and break do else elseif end false for function goto if in local nil not or repeat return then true until while self',
    t: 'string table math io os coroutine print type pairs ipairs next require setmetatable getmetatable rawget rawset tostring tonumber assert error pcall xpcall select unpack',
    b: 'print require setmetatable pcall',
    c: 'true false nil',
  }),
  lang('r', 'R', {
    a: ['r', 'rscript'],
    e: ['r', 'rprofile'],
    line: ['#'],
    str: ['"', "'"],
    kw: 'break else for function if in next repeat return while library require TRUE FALSE NULL Inf NaN NA',
    t: 'numeric integer character logical complex factor list data.frame matrix array vector',
    b: 'print cat paste c length names str summary plot mean median sd sum min max seq rep apply lapply sapply tapply data.frame read.csv write.csv',
    c: 'TRUE FALSE NULL NA NaN Inf',
  }),
  lang('matlab', 'MATLAB', {
    a: ['matlab', 'octave'],
    e: ['m'],
    line: ['%'], block: [['%{', '%}']],
    str: ['"', "'"],
    kw: 'break case catch classdef continue else elseif end for function global if otherwise parfor persistent return switch try while',
    t: 'double single int8 int16 int32 int64 uint8 uint16 uint32 uint64 logical char cell struct table string',
    b: 'disp fprintf sprintf plot figure zeros ones eye size length numel reshape find sum mean max min abs sqrt',
    c: 'true false Inf NaN pi eps',
  }),
  lang('julia', 'Julia', {
    a: ['julia', 'jl'],
    e: ['jl'],
    line: ['#'], block: [['#=', '=#']],
    str: ['"', ['"""', { multi: true }]],
    kw: 'abstract baremodule begin break catch const continue do else elseif end export finally for function global if import in isa let local macro module quote return struct try using where while mutable primitive type',
    t: 'Any Bool Char Dict Float16 Float32 Float64 Int Int8 Int16 Int32 Int64 Integer Array Matrix Vector String Symbol Tuple Nothing Missing Union',
    b: 'println print push! pop! length size map filter reduce sum maximum minimum zeros ones rand',
    c: 'true false nothing missing',
    decorator: '@',
  }),
  lang('dart', 'Dart', {
    a: ['dart'],
    e: ['dart'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'", ['"""', { multi: true }], ["'''", { multi: true }]],
    kw: 'abstract as assert async await break case catch class const continue covariant default deferred do dynamic else enum export extends extension external factory false final finally for get hide if implements import in interface is late library mixin new null on operator part required rethrow return sealed set show static super switch sync this throw try typedef var void when while with yield',
    t: 'bool double int num String List Map Set Future Stream Iterable Object dynamic Function Duration',
    b: 'print debugPrint assert',
    c: 'true false null',
    decorator: '@',
  }),
  lang('elixir', 'Elixir', {
    a: ['ex', 'exs', 'elixir'],
    e: ['ex', 'exs'],
    line: ['#'],
    str: ['"', ['"""', { multi: true }], ["'''", { multi: true }]],
    kw: 'after and case catch cond def defdelegate defexception defimpl defmacro defmodule defp defprotocol defstruct do else end fn for if import in not or quote raise receive require rescue reraise super throw try unless unquote use when with',
    t: 'Atom BitString Float Function Integer List Map PID Port Reference Tuple String',
    b: 'IO Enum Map List String Keyword Process Task Agent GenServer Supervisor',
    c: 'true false nil',
    decorator: '@',
  }),
  lang('erlang', 'Erlang', {
    a: ['erl', 'hrl', 'erlang'],
    e: ['erl', 'hrl'],
    line: ['%'],
    str: ['"', "'", ['~"', { esc: null, to: '"' }]],
    kw: 'after begin case catch cond end fun if let of query receive try when and andalso band bnot bor bsl bsr bxor div not or orelse rem xor',
    t: 'atom binary bitstring boolean byte char float function integer list map nil number pid port reference tuple',
    b: 'io format spawn spawn_link send self length hd tl element tuple_to_list list_to_tuple',
    c: 'true false undefined ok error',
    decorator: '-',
  }),
  lang('haskell', 'Haskell', {
    a: ['hs', 'haskell', 'lhs'],
    e: ['hs', 'lhs'],
    line: ['--'], block: [['{-', '-}']],
    str: ['"', "'"],
    kw: 'case class data default deriving do else foreign if import in infix infixl infixr instance let module newtype of then type where qualified as hiding',
    t: 'Bool Char Double Either Float Int Integer IO Maybe Ordering String Word',
    b: 'map filter foldr foldl length head tail null elem show read print putStrLn return pure fmap',
    c: 'True False Nothing Just Left Right',
  }),
  lang('clojure', 'Clojure', {
    a: ['clj', 'cljs', 'cljc', 'edn'],
    e: ['clj', 'cljs', 'cljc', 'edn'],
    line: [';'],
    str: ['"'],
    kw: 'def defn defmacro defonce defmulti defmethod defrecord defprotocol deftype ns let letfn fn if if-let if-not do loop recur when when-let when-not cond condp case and or not try catch finally throw new set! quote var require use import',
    t: 'int long float double boolean char String Keyword Symbol Atom Ref Agent Map Vector List Set Seq',
    b: 'println print str map filter reduce apply conj cons assoc dissoc get get-in update count first rest seq',
    c: 'true false nil',
    decorator: ':',
  }),
  lang('lisp', 'Lisp', {
    a: ['lisp', 'lsp', 'el'],
    e: ['lisp', 'lsp', 'el'],
    line: [';'],
    str: ['"'],
    kw: 'defun defmacro defvar defparameter defconstant defclass defmethod defstruct lambda let let* if cond case when unless progn setq setf quote function loop dolist dotimes and or not car cdr cons list append eval apply',
    t: 'nil t list string integer float symbol function',
    b: 'format print princ terpri read eval load mapcar reduce',
    c: 't nil',
  }),
  lang('fsharp', 'F#', {
    a: ['fs', 'fsx', 'fsi', 'fsharp'],
    e: ['fs', 'fsx', 'fsi'],
    line: ['//'], block: [['(*', '*)']],
    str: ['"', "'", ['"""', { multi: true }]],
    kw: 'abstract and as assert base begin class default delegate do done downcast downto elif else end exception extern false finally fixed for fun function global if in inherit inline interface internal lazy let match member module mutable namespace new not null of open or override private public rec return sig static struct then to trait true try type upcast use val void when while with yield',
    t: 'bool byte char decimal double float int int16 int32 int64 list map option seq set string uint unit array async result',
    b: 'printfn printf failwith ignore id fst snd List Map Seq Async',
    c: 'true false null None Some Ok Error',
  }),
  lang('vb', 'Visual Basic', {
    a: ['vb', 'vbs', 'vbnet', 'bas'],
    e: ['vb', 'vbs', 'bas', 'cls', 'frm'],
    ci: true,
    line: ["'"],
    str: ['"'],
    kw: 'AddHandler AddressOf Alias And AndAlso As Boolean ByRef Byte ByVal Call Case Catch CBool CByte CChar CDate CDbl CDec Char CInt Class CLng CObj Const Continue CSByte CShort CSng CStr CType CUInt CULng CUShort Date Decimal Declare Default Delegate Dim DirectCast Do Double Each Else ElseIf End Enum Erase Error Event Exit False Finally For Friend Function Get GetType Global GoSub GoTo Handles If Implements Imports In Inherits Integer Interface Is IsNot Let Lib Like Long Loop Me Mod Module MustInherit MustOverride MyBase MyClass Namespace Narrowing New Next Not Nothing NotInheritable NotOverridable Object Of On Operator Option Optional Or OrElse Out Overloads Overridable Overrides ParamArray Partial Private Property Protected Public RaiseEvent ReadOnly ReDim REM RemoveHandler Resume Return SByte Select Set Shadows Shared Short Single Static Step Stop String Structure Sub SyncLock Then Throw To True Try TryCast TypeOf UInteger ULong UShort Using Variant Wend When While Widening With WithEvents WriteOnly Xor',
    t: 'Boolean Byte Char Date Decimal Double Integer Long Object SByte Short Single String UInteger ULong UShort',
    b: 'Console Math MsgBox Len Mid InStr UBound LBound Trim CStr CInt',
    c: 'True False Nothing',
  }),
  lang('pascal', 'Pascal', {
    a: ['pascal', 'pas', 'delphi'],
    e: ['pas', 'pp', 'dpr', 'lpr'],
    ci: true,
    line: ['//'], block: [['{', '}'], ['(*', '*)']],
    str: ["'"],
    kw: 'and array as asm begin case class const constructor destructor dispinterface div do downto else end except exports file finalization finally for function goto if implementation in inherited initialization inline interface is label library mod nil not object of on operator or out packed procedure program property raise record repeat resourcestring set shl shr string then threadvar to try type unit until uses var while with xor',
    t: 'Boolean Byte Char Integer LongInt Real ShortInt Single Double Extended String WideString AnsiString Pointer Cardinal',
    b: 'Writeln Write Readln Read Format FloatToStr IntToStr StrToInt',
    c: 'True False nil',
  }),
  lang('fortran', 'Fortran', {
    a: ['fortran', 'f90', 'f95', 'f03'],
    e: ['f', 'f90', 'f95', 'f03', 'f08', 'for'],
    ci: true,
    line: ['!'],
    str: ['"', "'"],
    kw: 'allocatable allocate assignment associate asynchronous backspace bind block call case class close common contains continue cycle data deallocate default deferred dimension do else elseif elsewhere end enddo endif entry enum enumerator equivalence exit extends external final flush forall format function generic goto if implicit in include inquire intent interface intrinsic is kind len lock module namelist none nullify only open operator optional parameter pointer print private procedure program protected public pure read recursive result return rewind save select sequence stop submodule subroutine target then type use value volatile wait where while write',
    t: 'integer real complex logical character double precision dimension',
    b: 'print write read allocate deallocate size sum maxval minval matmul reshape trim',
    c: 'true false',
  }),
  lang('assembly', 'Assembly', {
    a: ['asm', 'nasm', 'gas'],
    e: ['asm', 's'],
    line: [';', '#'],
    str: ['"', "'"],
    kw: 'mov push pop call ret jmp je jne jz jnz jg jl jge jle ja jb add sub mul imul div idiv inc dec and or xor not shl shr sar sal cmp test lea nop int syscall leave enter xchg cld std rep movs stos lods section global extern db dw dd dq equ times org bits',
    t: 'eax ebx ecx edx esi edi ebp esp rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 ax bx cx dx al bl cl dl ah bh ch dh',
    b: 'printf scanf malloc free exit',
    c: 'byte word dword qword ptr',
  }),
  lang('sql', 'SQL', {
    a: ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'tsql', 'plsql', 'mariadb'],
    e: ['sql', 'ddl', 'dml', 'psql', 'mysql'],
    ci: true,
    line: ['--'], block: [['/*', '*/']],
    str: ["'", '"'],
    kw: 'add all alter and any as asc backup between by case check column constraint create database default delete desc distinct drop exec exists foreign from full group having in index inner insert into is join key left like limit not null offset on or order outer primary references right rollback row select set table top transaction trigger union unique update values view where with grant revoke begin commit declare cursor fetch procedure function returns return if else end while loop for each cast convert coalesce partition over window recursive',
    t: 'int integer bigint smallint tinyint decimal numeric float real double char varchar nvarchar text ntext date datetime datetime2 time timestamp boolean bit blob clob json jsonb uuid serial',
    b: 'count sum avg min max abs round coalesce isnull nullif cast convert substring trim upper lower length now getdate dateadd datediff row_number rank dense_rank',
    c: 'null true false',
  }),
  lang('solidity', 'Solidity', {
    a: ['sol', 'solidity'],
    e: ['sol'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"', "'"],
    kw: 'abstract after alias apply auto case catch constant copyof default define final immutable implements in inline let macro match mutable null of override partial promise reference relocatable sealed sizeof static supports switch typedef typeof unchecked var address bool break continue contract delete do else emit enum event external fallback for function if import indexed interface internal is library mapping memory modifier new payable pragma private public pure receive return returns storage struct this throw try using view virtual while constructor',
    t: 'address bool bytes bytes1 bytes32 int int8 int256 string uint uint8 uint256 fixed ufixed enum struct mapping',
    b: 'require assert revert keccak256 sha256 ecrecover addmod mulmod selfdestruct block msg tx abi',
    c: 'true false',
  }),
  lang('verilog', 'Verilog', {
    a: ['verilog', 'systemverilog', 'sv'],
    e: ['v', 'sv', 'svh', 'vh'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"'],
    kw: 'always and assign automatic begin buf case casex casez cell cmos config deassign default defparam design disable edge else end endcase endconfig endfunction endgenerate endmodule endprimitive endspecify endtable endtask event for force forever fork function generate genvar highz0 highz1 if ifnone initial inout input instance integer join large macromanage macromodule medium module nand negedge nmos nor noshowcancelled not notif0 notif1 or output parameter pmos posedge primitive pull0 pull1 pulldown pullup pulsestyle_ondetect pulsestyle_onevent rcmos real realtime reg release repeat rnmos rpmos rtran rtranif0 rtranif1 scalared showcancelled signed small specify specparam strong0 strong1 supply0 supply1 table task time tran tranif0 tranif1 tri tri0 tri1 triand trior trireg unsigned use vectored wait wand weak0 weak1 while wire wor xnor xor logic bit byte int shortint longint typedef struct enum packed',
    t: 'wire reg logic integer real time bit byte int shortint longint',
    b: 'display write monitor time finish stop random readmemh',
    c: 'true false',
    pre: '`',
  }),
  lang('zig', 'Zig', {
    a: ['zig'],
    e: ['zig'],
    line: ['//'],
    str: ['"', "'"],
    kw: 'addrspace align allowzero and anyframe anytype asm async await break catch comptime const continue defer else enum errdefer error export extern fn for if inline linksection noalias nosuspend opaque or orelse packed pub resume return struct suspend switch test threadlocal try union unreachable usingnamespace var volatile while',
    t: 'bool comptime_int comptime_float f16 f32 f64 f80 f128 i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize void noreturn type anyerror anyopaque',
    b: 'print stdout stderr allocator expect expectEqual',
    c: 'true false null undefined',
    attr: '@',
  }),
  lang('nim', 'Nim', {
    a: ['nim', 'nims'],
    e: ['nim', 'nims', 'nimble'],
    line: ['#'], block: [['#[', ']#']],
    str: ['"', ['"""', { multi: true }]],
    kw: 'addr and as asm bind block break case cast concept const continue converter defer discard distinct div do elif else end enum except export finally for from func if import in include interface is isnot iterator let macro method mixin mod nil not notin object of or out proc ptr raise ref return shl shr static template try tuple type using var when while with without xor yield',
    t: 'int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float float32 float64 bool char string seq array set Table JsonNode',
    b: 'echo len add new inc dec ord chr high low sizeof',
    c: 'true false nil',
    decorator: '@',
  }),
  lang('ocaml', 'OCaml', {
    a: ['ocaml', 'ml', 'mli'],
    e: ['ml', 'mli'],
    line: [], block: [['(*', '*)']],
    str: ['"', "'"],
    kw: 'and as assert asr begin class constraint do done downto else end exception external false for fun function functor if in include inherit initializer land lazy let lor lsl lsr lxor match method mod module mutable new nonrec object of open or private rec sig struct then to true try type val virtual when while with',
    t: 'int float bool char string unit list array option ref bytes int32 int64 nativeint',
    b: 'print_endline Printf.printf List.map List.filter String.length',
    c: 'true false None Some',
  }),
  lang('powershell', 'PowerShell', {
    a: ['powershell', 'ps1', 'pwsh'],
    e: ['ps1', 'psm1', 'psd1'],
    ci: true,
    line: ['#'], block: [['<#', '#>']],
    str: ['"', "'"],
    kw: 'begin break catch class continue data define do dynamicparam else elseif end enum exit filter finally for foreach from function hidden if in param process return static switch throw trap try until using var while workflow',
    t: 'string int long double decimal bool byte char datetime array hashtable pscustomobject switch securestring guid',
    b: 'Write-Host Write-Output Get-ChildItem Get-Item Get-Content Set-Content Select-Object Where-Object ForEach-Object Sort-Object Measure-Object New-Object Join-Path Test-Path Split-Path',
    c: '$true $false $null',
    vars: ['$'],
  }),
  lang('shell', 'Shell', {
    a: ['bash', 'sh', 'zsh', 'ksh', 'shell', 'console'],
    e: ['sh', 'bash', 'zsh', 'ksh'],
    line: ['#'],
    str: ['"', "'", ['`', { multi: true }]],
    kw: 'alias bg bind break builtin cd command continue declare dirs disown echo elif else enable eval exec exit export false fc fg getopts hash help history if in jobs kill let local logout mapfile popd printf pushd pwd read readonly return set shift shopt source suspend test then time times trap true type typeset ulimit umask unalias unset until wait while function case esac do done fi for select',
    t: 'int string array',
    b: 'ls cat grep sed awk find xargs sort uniq head tail cut tr wc curl wget git npm node python mkdir rm cp mv chmod chown tar zip unzip ssh scp docker kubectl systemctl ps top df du env',
    c: 'true false',
    vars: ['$'],
    heredoc: true,
  }),
  lang('fish', 'Fish', {
    a: ['fish'],
    e: ['fish'],
    line: ['#'],
    str: ['"', "'"],
    kw: 'and begin break builtin case command continue else end exec for function if in not or read return set switch test while',
    b: 'echo printf cd ls cat grep sed set export source string count contains',
    c: 'true false',
    vars: ['$'],
  }),
  lang('batch', 'Batch', {
    a: ['bat', 'batch', 'cmd', 'dos'],
    e: ['bat', 'cmd'],
    ci: true,
    line: ['REM', '::'],
    str: ['"'],
    kw: 'assoc attrib break call cd chdir chcp cls color copy date del dir echo endlocal erase exit for goto if md mkdir move path pause popd prompt pushd rd rem ren rename rmdir set setlocal shift start time title type ver verify vol',
    t: 'string int',
    b: 'echo set if for goto call exit',
    c: 'on off',
    vars: ['%', '!'],
  }),
  lang('glsl', 'GLSL', {
    a: ['glsl', 'shader'],
    e: ['glsl', 'vert', 'frag', 'geom', 'comp', 'shader'],
    line: ['//'], block: [['/*', '*/']],
    str: ['"'],
    kw: 'attribute const uniform varying buffer shared coherent volatile restrict readonly writeonly layout centroid flat smooth noperspective patch sample break continue do for while switch case default if else subroutine in out inout float double int void bool true false invariant precise discard return struct uint vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 mat2x2 mat3x3 mat4x4 sampler2D samplerCube precision highp mediump lowp',
    t: 'vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 sampler2D void float double int uint bool',
    b: 'texture texture2D textureCube mix clamp dot cross normalize length reflect refract sin cos tan pow exp log sqrt abs min max fract mod step smoothstep',
    c: 'true false',
  }),
  lang('gdscript', 'GDScript', {
    a: ['gdscript', 'godot'],
    e: ['gd'],
    line: ['#'],
    str: ['"', "'", ['"""', { multi: true }]],
    kw: 'and as assert await break class class_name const continue elif else enum extends for func if in is match not null or pass preload return self signal static super tool var while yield',
    t: 'bool int float String Vector2 Vector3 Vector4 Color Array Dictionary Node Node2D Node3D Sprite Texture Resource PackedScene',
    b: 'print str int float len range load instance instantiate connect emit',
    c: 'true false null',
    decorator: '@',
  }),
  lang('apex', 'Apex', {
    a: ['apex', 'cls'],
    e: ['trigger'],
    line: ['//'], block: [['/*', '*/']],
    str: ["'"],
    kw: 'abstract break catch class continue delete do else enum extends final finally for get global if implements insert instanceof interface new null override private protected public return rollback set static super switch testmethod this throw trigger try undelete update upsert virtual void while with sharing without',
    t: 'Boolean Blob Date Datetime Decimal Double Id Integer Long Object String List Map Set SObject',
    b: 'System Database Trigger Test',
    c: 'true false null',
  }),
  lang('protobuf', 'Protocol Buffers', {
    a: ['proto', 'protobuf'],
    e: ['proto'],
    line: ['//'],
    str: ['"', "'"],
    kw: 'syntax package import option message enum service rpc returns oneof map repeated optional required reserved extensions extend group to max public weak',
    t: 'double float int32 int64 uint32 uint64 sint32 sint64 fixed32 fixed64 sfixed32 sfixed64 bool string bytes',
    b: 'deprecated packed json_name',
    c: 'true false',
  }),
  lang('graphql', 'GraphQL', {
    a: ['graphql', 'gql'],
    e: ['graphql', 'gql'],
    line: ['#'],
    str: ['"', ['"""', { multi: true }]],
    kw: 'query mutation subscription fragment on type interface union enum input scalar schema extend directive implements repeatable',
    t: 'Int Float String Boolean ID',
    b: 'skip include deprecated',
    c: 'true false null',
  }),
  lang('terraform', 'Terraform', {
    a: ['terraform', 'tf', 'hcl'],
    e: ['tf', 'tfvars', 'hcl'],
    line: ['#', '//'], block: [['/*', '*/']],
    str: ['"'],
    kw: 'resource data variable output module provider terraform locals backend for_each count depends_on lifecycle provisioner dynamic for in if',
    t: 'string number bool list map object set tuple any',
    b: 'file templatefile lookup length concat merge join split element format',
    c: 'true false null',
  }),
  lang('nix', 'Nix', {
    a: ['nix'],
    e: ['nix'],
    line: ['#'], block: [['/*', '*/']],
    str: ['"', ["''", { multi: true }]],
    kw: 'assert else if in inherit let or rec then with import builtins',
    t: 'int float bool string path list attrs null',
    b: 'map filter foldl length attrNames attrValues elem hasAttr',
    c: 'true false null',
  }),
  lang('vim', 'Vim Script', {
    a: ['vim', 'viml'],
    e: ['vim'],
    line: ['"'],
    str: ["'"],
    kw: 'let set setlocal unlet function endfunction if endif else elseif while endwhile for endfor return call execute echo echom normal map nmap vmap imap nnoremap inoremap vnoremap command autocmd augroup endtry try catch finally throw silent',
    b: 'expand exists has getline setline printf substitute matchstr split join len empty',
    c: 'v:true v:false v:null',
  }),
  lang('awk', 'AWK', {
    a: ['awk', 'gawk'],
    e: ['awk'],
    line: ['#'],
    str: ['"'],
    kw: 'BEGIN END break continue delete do else exit for function getline if in next nextfile print printf return while',
    b: 'length substr index split sub gsub match sprintf printf print close system',
    c: 'NR NF FS OFS ORS RS FILENAME',
  }),
  lang('cobol', 'COBOL', {
    a: ['cobol'],
    e: ['cob', 'cbl', 'cpy'],
    ci: true,
    line: ['*>'],
    str: ['"', "'"],
    kw: 'accept add alter and call cancel close compute configuration continue data declare delete display divide division else end end-if end-perform environment evaluate exit file fillers for from function generate go goback identification if initialize input inspect into invalid is just justified key linkage local-storage merge move multiply not object-computer of open or output perform picture procedure program-id read record redefines release replace return rewrite redefines section select sentence set sort source-computer stop string subtract then through times to unstring until use using value values varying when write working-storage',
    t: 'pic picture comp comp-1 comp-2 comp-3 binary display packed-decimal',
    b: 'display move compute perform',
    c: 'zero zeros space spaces high-value low-value',
  }),
];

/* ------------------------------------------------------------------ *
 * 配置、数据与标记语言（专用扫描模式）
 * ------------------------------------------------------------------ */

const DATA_LANGUAGES = [
  lang('json', 'JSON', { a: ['jsonc', 'json5'], e: ['json', 'jsonc', 'json5', 'jsonl', 'ndjson'], mode: 'json', line: ['//'], block: [['/*', '*/']] }),
  lang('yaml', 'YAML', { a: ['yml'], e: ['yaml', 'yml'], mode: 'yaml' }),
  lang('toml', 'TOML', { a: ['toml'], e: ['toml'], mode: 'ini', line: ['#'], str: ['"', "'"] }),
  lang('ini', 'INI', { a: ['properties', 'config', 'conf', 'cfg', 'dotenv', 'env', 'editorconfig'], e: ['ini', 'cfg', 'conf', 'properties', 'env', 'editorconfig', 'prefs'], mode: 'ini', line: [';', '#'] }),
  lang('xml', 'XML', { a: ['xsd', 'xsl', 'xslt', 'plist', 'svg', 'rss', 'atom', 'csproj', 'pom'], e: ['xml', 'xsd', 'xsl', 'xslt', 'svg', 'plist', 'rss', 'atom', 'csproj', 'xaml', 'resx'], mode: 'markup' }),
  lang('html', 'HTML', { a: ['htm', 'xhtml', 'vue', 'svelte'], e: ['html', 'htm', 'xhtml', 'vue', 'svelte', 'astro'], mode: 'markup' }),
  lang('css', 'CSS', { a: ['scss', 'sass', 'less', 'stylus'], e: ['css', 'scss', 'sass', 'less', 'styl'], mode: 'css' }),
  lang('markdown', 'Markdown', { a: ['md', 'mdx', 'mkd'], e: ['md', 'markdown', 'mdx', 'mkd'], mode: 'markdown' }),
  lang('diff', 'Diff', { a: ['patch', 'udiff'], e: ['diff', 'patch'], mode: 'diff' }),
  lang('makefile', 'Makefile', { a: ['make', 'cmake', 'mk'], e: ['mk', 'make', 'cmake', 'mak'], mode: 'makefile', line: ['#'] }),
  lang('dockerfile', 'Dockerfile', { a: ['containerfile'], e: ['dockerfile', 'containerfile'], mode: 'makefile', line: ['#'], ci: true }),
  lang('latex', 'LaTeX', { a: ['tex', 'texlive'], e: ['tex', 'sty', 'cls', 'bib'], mode: 'latex' }),
  lang('csv', 'CSV', { a: ['tsv', 'dsv'], e: ['csv', 'tsv', 'psv'], mode: 'csv' }),
  lang('nginx', 'Nginx', { a: ['nginxconf'], e: ['nginx'], mode: 'ini', line: ['#'] }),
  lang('http', 'HTTP', { a: ['rest'], e: ['http', 'rest'], mode: 'http' }),
  lang('mermaid', 'Mermaid', { a: ['mmd'], e: ['mmd', 'mermaid'], mode: 'makefile', line: ['%%'] }),
  lang('text', 'Plain Text', { a: ['plain', 'plaintext', 'txt', 'log', 'none'], e: ['txt', 'text', 'log', 'out'], mode: 'plain' }),
];

/* ------------------------------------------------------------------ *
 * 索引与解析
 * ------------------------------------------------------------------ */

const ALL = [...CODE_LANGUAGES, ...DATA_LANGUAGES];

/** 语言 id → 定义。 */
const BY_ID = new Map();
/** 别名与扩展名 → 语言 id。 */
const BY_ALIAS = new Map();

for (const def of ALL) {
  BY_ID.set(def.id, def);
  for (const alias of def.aliases) if (!BY_ALIAS.has(alias)) BY_ALIAS.set(alias, def.id);
  for (const ext of def.ext) if (!BY_ALIAS.has(ext)) BY_ALIAS.set(ext, def.id);
}

/** 所有可识别的语言 id，按字母排序。 */
export const LANGUAGE_IDS = [...BY_ID.keys()].sort();

/** 语言 id 列表，供工具描述展示。 */
export const LANGUAGE_LIST = ALL.map((def) => def.id).sort().join(', ');

/**
 * 归一化一个语言写法：去掉 `language-` / `lang-` 前缀、去掉前导点、转小写。
 * @param {unknown} raw 原始语言写法。
 * @returns {string} 归一化结果，空串表示未提供。
 */
export function normalizeLanguageName(raw) {
  if (typeof raw !== 'string') return '';
  let value = raw.trim().toLowerCase();
  if (!value) return '';
  value = value.replace(/^(language|lang|source|highlight)-/, '');
  value = value.replace(/^\./, '');
  value = value.replace(/^\{\.?/, '').replace(/\}$/, '');
  value = value.replace(/^[-.]+/, '');
  return value;
}

/**
 * 解析语言定义。支持 id、别名、扩展名与 `language-xxx` 围栏写法。
 * @param {unknown} raw 语言写法。
 * @returns {object|undefined} 语言定义；无法识别时返回 undefined。
 */
export function resolveLanguage(raw) {
  const name = normalizeLanguageName(raw);
  if (!name) return undefined;
  if (BY_ID.has(name)) return BY_ID.get(name);
  const id = BY_ALIAS.get(name);
  return id ? BY_ID.get(id) : undefined;
}

/**
 * 从路径推断语言定义。
 * @param {string} path 文件名或路径，`/` 与 `\\` 都作为分隔符。
 * @returns {object|undefined} 语言定义。
 */
export function languageForPath(path) {
  if (typeof path !== 'string' || !path) return undefined;
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const base = path.slice(slash + 1).toLowerCase();
  const dot = base.lastIndexOf('.');
  if (dot >= 0 && dot < base.length - 1) {
    const ext = base.slice(dot + 1);
    const id = BY_ALIAS.get(ext);
    if (id) return BY_ID.get(id);
  }
  // 无扩展名的约定文件名（Dockerfile、Makefile 等）。
  const bare = base.replace(/^(gnu)?makefile$/, 'makefile').replace(/^dockerfile.*$/, 'dockerfile');
  const id = BY_ALIAS.get(bare) || BY_ID.get(bare);
  if (id) return typeof id === 'string' ? BY_ID.get(id) : id;
  const aliasId = BY_ALIAS.get(base);
  return aliasId ? BY_ID.get(aliasId) : undefined;
}

/**
 * 文件扩展名 → 语言 id 的表，供其他模块复用。
 * @returns {Record<string, string>} 只读映射。
 */
export function extensionTable() {
  const table = {};
  for (const [alias, id] of BY_ALIAS) table[alias] = id;
  return table;
}
