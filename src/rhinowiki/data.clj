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
  (let [ file-name (.getName file) ]
    (if-let [ extension-delim-pos (.indexOf file-name ".") ]
      (if (>= extension-delim-pos 0)
        (.substring file-name 0 extension-delim-pos)
        file-name)
      file-name)))

(defn- data-files []
  (map (fn [ data-file ]
         (let [parsed (markdown/md-to-html-string-with-meta (slurp data-file))
               file-name (file-base-name data-file) 
               title (first (get-in parsed [:metadata :title] [ file-name ]))]
           {:name file-name
            :title title
            :content-html (:html parsed)
            :date (or
                   (maybe-parse-date (first (get-in parsed [ :metadata :date ])))
                   (java.util.Date. (.lastModified data-file)))}))
       (filter #(.isFile %)
               (file-seq (java.io.File. "data/")))))

(defn articles-by-name []
  (into {}
        (map (fn [ file-info ] [(:name file-info) file-info])
             (data-files))))

(defn recent-articles []
  (sort-by :date (data-files)))
