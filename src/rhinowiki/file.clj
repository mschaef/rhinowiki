(ns rhinowiki.file
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]))

(def file-hash-namespace #uuid "dc8f0822-f57d-48d6-a281-448c5b97a84b")

(defn- load-raw-data-file [ data-file ]
  (let [ content-raw (slurp data-file) ] 
    {:name (.getName data-file) 
     :content-raw content-raw
     :id (uuid/v5 file-hash-namespace content-raw)
     :file-date (java.util.Date. (.lastModified data-file))}))


(defn load-data-files [ & {:keys [ article-root ]
                           :or { article-root ""}} ]
  (log/info "Loading data files.")
  (map load-raw-data-file
       (filter #(.isFile %)
               (file-seq (java.io.File. article-root)))))
 
