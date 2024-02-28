(ns rhinowiki.highlight
  (:use playbook.core)
  (:require [taoensso.timbre :as log]))

(def hljs-languages ["awk" "bash" "basic" "c" "clojure-repl" "clojure"
                     "cpp" "csharp" "css" "diff" "dockerfile" "dos"
                     "elixir" "erlang" "haskell" "http" "ini" "java"
                     "javascript" "json" "lisp" "makefile" "markdown"
                     "nginx" "nix" "objectivec" "ocaml" "pgsql"
                     "protobuf" "python-repl" "python" "rust" "scala"
                     "scheme" "scss" "shell" "smalltalk" "sml" "sql"
                     "stata" "swift" "tcl" "typescript" "xml" "yaml"])

(defn make-javascript-context []
  (-> (org.graalvm.polyglot.Context/newBuilder (into-array String ["js"]))
      (.allowAllAccess true)
      (.option "engine.WarnInterpreterOnly" "false")
      (.build)))

(def highlight-js-code "(function(code, lang) { return hljs.highlight(code, {language: lang}).value; })")

(def highlighter
  (future
    (with-exception-barrier "create-highlighter"
      (let [pg (make-javascript-context)]
        (.eval pg "js" (slurp (clojure.java.io/resource "highlight/highlight.js")))
        (doseq [ lang hljs-languages ]
          (log/debug "Loading highlight language: " lang)
          (.eval pg "js" (slurp (clojure.java.io/resource (str "highlight/languages/" lang ".js")))))
        (let [ highlight-js-fn (.eval pg "js" highlight-js-code)]
          (fn [ code lang ]
            (.asString (.execute highlight-js-fn (object-array [ code lang ])))))))))

(defn highlight [code lang]
  (@highlighter code lang))
