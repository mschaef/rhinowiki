(ns rhinowiki.file
  (:use playbook.core)
  (:require [taoensso.timbre :as log]
            [clj-uuid :as uuid]))

(def file-hash-namespace #uuid "dc8f0822-f57d-48d6-a281-448c5b97a84b")

(defn- load-raw-data-file [ article-root data-file ]
  (log/debug "Loading file:" data-file)
  (let [ content-raw (binary-slurp data-file) ]
    {:file-name (.substring (.getCanonicalPath data-file)
                            (+ 1 (.length (.getCanonicalPath article-root))))
     :content-raw content-raw
     :id (uuid/v5 file-hash-namespace content-raw)
     :file-date (java.util.Date. (.lastModified data-file))}))

(defn- files-at-root [ article-root exclude-prefix ]
  (filter #(and
            (.isFile %)
            (not (and exclude-prefix
                      (.startsWith (.getPath %) exclude-prefix))))
          (file-seq article-root)))

(defn load-data-files [ & {:keys [ article-root exclude-prefix ]
                           :or {article-root ""}} ]
  (let [ article-root (java.io.File. article-root) ]
    (log/info "Loading data files:" (.getCanonicalPath article-root))
    (map (partial load-raw-data-file article-root)
         (files-at-root article-root exclude-prefix))))
