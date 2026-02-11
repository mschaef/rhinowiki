(ns rhinowiki.blog.highlight
  (:use playbook.core)
  (:require [taoensso.timbre :as log]))

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
        (.eval pg "js" (slurp (clojure.java.io/resource "highlight.min.js")))
        (.eval pg "js" (slurp (clojure.java.io/resource "logo.js")))
        (let [highlight-js-fn (locking pg
                                (.eval pg "js" highlight-js-code))]
          (fn [code lang]
            (locking pg
              (.asString (.execute highlight-js-fn (object-array [code lang]))))))))))

(defn highlight [file-name code lang]
  (if (= lang "")
    {:lang "text"
     :error (str "Code found missing language specification while processing file: " file-name)
     :code code}
    (try
      {:lang lang
       :code (@highlighter code lang)}
      (catch Exception ex
        {:error (str "Error highlighting code in language \"" lang "\" while processing file: " file-name " (" (.getMessage ex) ")")
         :code (@highlighter code "text")
         :lang "text"}))))
