(ns rhinowiki.utils)

(defmacro get-version []
  ;; Capture compile-time property definition from Lein
  (System/getProperty "rhinowiki.version"))
