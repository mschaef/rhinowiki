(ns rhinowiki.data
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [markdown.core :as markdown]))
 
(def article-root "data/")

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))

(defn maybe-parse-date [ text ]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn- load-raw-data-file [ data-file ]
  {:name (.getName data-file) 
   :content-raw (slurp data-file)
   :file-date (java.util.Date. (.lastModified data-file))})

(defn- load-data-file [ data-file ]
  (let [raw (load-raw-data-file data-file)
        parsed (markdown/md-to-html-string-with-meta (:content-raw raw))]
    (merge raw
           {:content-html (:html parsed)
            :title (first (get-in parsed [:metadata :title] [ (:name raw)]))
            :date (or (maybe-parse-date (first (get-in parsed [ :metadata :date ])))
                      (:file-date raw))})))

(defn- load-data-files []
  (log/info "Loading data files.")
  (map load-data-file
       (filter #(.isFile %)
               (file-seq (java.io.File. article-root)))))

(def file-cache (atom nil))

(defn- data-files []
  (if-let [files @file-cache]
    files
    (swap! file-cache (fn [ current-file-cache ]
                        (load-data-files)))))

;;; External API

(defn invalidate-cache []
  (log/info "Invalidating cache")
  (swap! file-cache (fn [ current-file-cache ] nil)))

(defn article-by-name [ name ]
  (log/info "Fetching article by name" name)
  (first (filter #(= name (:name %)) (data-files))))

(defn recent-articles []
  (log/info "Fetching recent articles")
  (reverse (sort-by :date (data-files))))
 
