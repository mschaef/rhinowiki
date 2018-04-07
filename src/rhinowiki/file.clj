(ns rhinowiki.file
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]))

(def file-hash-namespace #uuid "dc8f0822-f57d-48d6-a281-448c5b97a84b")

(defn- strip-ending [ file-name ending ]
  (and (.endsWith file-name ending)
       (.substring file-name 0 (- (.length file-name) (.length ending)))))

(defn- file-name-article-name [ file-name ]
  (or (strip-ending file-name "/index.md")
      (strip-ending file-name ".md")))

(defn- find-file-article [ data-file article-root ]
  (if-let [ article-name (file-name-article-name (:file-name data-file))]
    (merge data-file {:article-name article-name
                      :content-text (String. (:content-raw data-file) "UTF-8")})
    data-file))

(defn- load-raw-data-file [ data-file ]
  (log/debug "Loading file: " data-file)
  (let [ content-raw (binary-slurp data-file) ] 
    {:file-name (.getName data-file) 
     :content-raw content-raw
     :id (uuid/v5 file-hash-namespace content-raw)
     :file-date (java.util.Date. (.lastModified data-file))}))

(defn- files-at-root [ root ]
  (filter #(.isFile %) (file-seq (java.io.File. root))))

(defn load-data-files [ & {:keys [ article-root ]
                           :or { article-root ""}} ]
  (log/info "Loading data files.")
  (map #(find-file-article % article-root)
       (map load-raw-data-file (files-at-root article-root))))
 
