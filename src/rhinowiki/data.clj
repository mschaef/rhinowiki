(ns rhinowiki.data
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [markdown.core :as markdown]))

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))

(defn maybe-parse-date [ text ]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn file-base-name [ file ]
  (.getName file))

(defn- load-data-file [ data-file ]
  (let [parsed (markdown/md-to-html-string-with-meta (slurp data-file))
        file-name (file-base-name data-file) 
        title (first (get-in parsed [:metadata :title] [ file-name ]))]
    {:name file-name
     :title title
     :content-html (:html parsed)
     :date (or
            (maybe-parse-date (first (get-in parsed [ :metadata :date ])))
            (java.util.Date. (.lastModified data-file)))}))

(defn- data-files []
  (map load-data-file
       (filter #(.isFile %)
               (file-seq (java.io.File. "data/")))))

(defn article-by-name [ name ]
  (let [ file (java.io.File. (str "data/" name)) ]
    (log/info file (.isFile file))
    (and (.isFile file)
         (load-data-file file))))

(defn recent-articles []
  (reverse (sort-by :date (data-files))))
