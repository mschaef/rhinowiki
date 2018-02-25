(ns rhinowiki.blog
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]
            [markdown.core :as markdown]))

(def recent-post-limit 10)

(def blog-namespace #uuid "bf820223-4be5-495a-817e-c674271e43d2")

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))

(defn blog-init [ blog ]
  (merge blog
         {:file-cache (atom nil)
          :blog-id (uuid/v5 blog-namespace (map blog [:base-url :blog-author :blog-title]))}))

(defn maybe-parse-date [ text ]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn- parse-data-file [ raw ]
  (let [parsed (markdown/md-to-html-string-with-meta (:content-raw raw))]
    (merge raw
           {:content-html (:html parsed)
            :title (first (get-in parsed [:metadata :title] [ (:name raw)]))
            :date (or (maybe-parse-date (first (get-in parsed [ :metadata :date ])))
                      (:file-date raw))})))

(defn process-data-files [ data-files ]
  (let [ ordered (reverse (sort-by :date (map parse-data-file data-files))) ]
    {:ordered ordered
     :by-name (into {} (map (fn [ file ]
                              [(:name file) file])
                            ordered ))}))

(defn data-files [ blog ]
  (if-let [files @(:file-cache blog)]
    files
    (swap! (:file-cache blog) (fn [ current-file-cache ]
                                (process-data-files ((:load-fn blog)))))))

(defn invalidate-cache [ blog ]
  (log/info "Invalidating cache")
  (swap! (:file-cache blog) (fn [ current-file-cache ] nil)))

(defn article-by-name [ blog name ]
  (log/info "Fetching article by name" name)
  (get-in (data-files blog) [ :by-name name ]))

(defn recent-articles [ blog ]
  (log/info "Fetching recent articles")
  (take recent-post-limit (:ordered (data-files blog))))

(defn article-permalink [ blog article ]
     (str (:base-url blog) "/" (:name article)))

