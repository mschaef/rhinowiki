(ns rhinowiki.data
     (:use rhinowiki.utils))

(defn- data-files []
  (map (fn [ data-file ]
         {:name (.getName data-file)
          :content-markdown (slurp data-file)
          :last-modified (java.util.Date. (.lastModified data-file))})
       (filter #(.isFile %)
               (file-seq (java.io.File. "data/")))))

(defn articles-by-name []
  (into {}
        (map (fn [ file-info ] [(:name file-info) file-info])
             (data-files))))

(defn recent-articles []
  (data-files))
