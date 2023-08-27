(ns rhinowiki.parser
  (:use playbook.core)
  (:require [taoensso.timbre :as log]
            [markdown.core :as md]
            [markdown.transformers :as mdt]))

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))

(defn maybe-parse-metadata-date [ text ]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn- make-server-image-link [ base src alt ]
  (format "![%s](%s)" alt (.getAbsolutePath (java.io.File. (format "/%s/%s" base src)))))

(defn- image-link-rewriter [ root-file-name ]
  (let [ base (or (.getParent (java.io.File. root-file-name)) "") ]
    (fn [ text state ]
      (loop [matches (distinct (re-seq #"!\[([^\]]+)\]\s*\(([^\)]+)\)" text))
             new-text text]
        (if (seq matches)
          (let [[m alt src] (first matches)]
            (recur (rest matches)
                   (clojure.string/replace new-text m (make-server-image-link base src alt))))
          [new-text state])))))

(defn parse-article-text [ file-name article-text ]
  (log/debug "parse-article-text" file-name)
  (md/md-to-html-string-with-meta article-text
                                  :footnotes? true
                                  :reference-links? true
                                  :replacement-transformers (cons (image-link-rewriter file-name)
                                                                  mdt/transformer-vector)))

(defn parse-article-file [ file-name raw ]
  (log/debug "parse-article-file" file-name)
  (let [metadata (md/md-to-meta raw)
        tags (set (remove empty? (clojure.string/split (first (:tags metadata [""])) #"\s+")))]
    (-> {:file-name file-name
         :content-html (delay (parse-article-text file-name raw))
         :title (first (:title metadata [(:article-name raw)]))
         :date (or (maybe-parse-metadata-date (first (:date metadata)))
                   (:file-date raw))
         :sponsor (first (:sponsor metadata [ nil ]))
         :tags tags
         :alias (:alias metadata [])
         :private (or (tags "private")
                      (try-parse-boolean (first (or (:private metadata)
                                                    ["false"]))))})))

(defn article-content-html [ article ]
  (log/debug "article-content-html" (:file-name article))
  (:html @(:content-html article)))
