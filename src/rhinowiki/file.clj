(ns rhinowiki.data
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]))
 
(def article-root "data/")

(defn- load-raw-data-file [ data-file ]
  {:name (.getName data-file) 
   :content-raw (slurp data-file)
   :file-date (java.util.Date. (.lastModified data-file))})


(defn load-data-files []
  (log/info "Loading data files.")
  (map load-raw-data-file
       (filter #(.isFile %)
               (file-seq (java.io.File. article-root)))))
 
