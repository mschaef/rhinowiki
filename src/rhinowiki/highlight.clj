(ns rhinowiki.highlight)


(def hljs-languages ["awk" "bash" "basic" "c" "clojure-repl" "clojure"
                     "cpp" "csharp" "css" "diff" "dockerfile" "dos"
                     "elixir" "erlang" "haskell" "http" "ini" "java"
                     "javascript" "json" "lisp" "makefile" "markdown"
                     "nginx" "nix" "objectivec" "ocaml" "pgsql"
                     "protobuf" "python-repl" "python" "rust" "scala"
                     "scheme" "scss" "shell" "smalltalk" "sml" "sql"
                     "stata" "swift" "tcl" "typescript" "xml" "yaml"])

(def highlighter
  (future
    (let [js (-> (javax.script.ScriptEngineManager.)
                 (.getEngineByName "graal-js"))]
      (.eval js (slurp (clojure.java.io/resource "highlight/highlight.js")))
      (doseq [ lang hljs-languages ]
        (.eval js (slurp (clojure.java.io/resource (str "highlight/languages/" lang ".js")))))
      js)))

(def render-code "hljs.highlight(code, {language: lang}).value")

(defn highlight [code lang]
  (.put @highlighter "code" code)
  (.put @highlighter "lang" lang)
  (.eval @highlighter render-code))
