(ns rhinowiki.core
  (:gen-class)
  (:use compojure.core
        rhinowiki.utils
        [ring.middleware not-modified content-type browser-caching])  
  (:require [clojure.tools.logging :as log]            
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [ring.util.response :as ring-response]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [rhinowiki.data :as data]))

(def blog-title "Mike Schaeffer's Weblog")
(def recent-post-limit 10)

;;;; HTML Renderer

(defn resource [ path ]
  (str "/" (get-version) "/" path))

(defn site-page [ page-title body ]
  (hiccup/html
   [:html
    [:head
     (page/include-css (resource "style.css"))
     (page/include-js (resource "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title page-title]]
    [:body
     [:div.header
      [:a {:href "/"}
       [:h1 blog-title]]]
     body
     [:div.footer
      "Copyright (C) 2017 - Mike Schaeffer"]]]))

(def date-format (java.text.SimpleDateFormat. "MMMM d, y"))

(defn article-block [ article-info ]
  [:div.article
   [:div.title
    (:title article-info)]
   [:div.date
    (.format date-format (:date article-info))]
   (:content-html article-info)])

(defn article-page [ article-name ]
  (when-let [ article-info (data/article-by-name article-name) ]
    (site-page (:title article-info) (article-block article-info))))

(defn recent-articles-page []
  (site-page blog-title
             (map (fn [ article-info ]
                    [:div
                     (article-block article-info)
                     [:a { :href (str "/" (:name article-info))}
                      "Permalink"]])
                  (take recent-post-limit (data/recent-articles)))))

(defroutes all-routes
  (GET "/" []
    (recent-articles-page))
  
  (GET "/:article-name" { params :params }
    (article-page (:article-name params)))
  
  (route/resources  (str "/" (get-version)))
  (route/resources "/")

  (POST "/invalidate" []
    (data/invalidate-cache)
    "invalidated")
  
  (route/not-found "Resource Not Found"))

;;;; Handler Stack

(defn wrap-request-logging [ app ]
  (fn [req]
    (log/debug 'REQUEST (:request-method req) (:uri req))
    (let [resp (app req)]
      (log/trace 'RESPONSE (:status resp))
      resp)))

(defn wrap-show-response [ app label ]
  (fn [req]
    (let [resp (app req)]
      (log/trace label (dissoc resp :body))
      resp)))

(def handler (-> all-routes
                 (wrap-content-type)
                 (wrap-browser-caching {"text/javascript" 360000
                                        "text/css" 360000})
                 (wrap-request-logging)
                 (handler/site)))
    
(defn start-webserver [ http-port ]
  (log/info "Starting Webserver on port" http-port)
  (let [server (jetty/run-jetty handler { :port http-port :join? false })]
    (add-shutdown-hook
     (fn []
       (log/info "Shutting down webserver")
       (.stop server)))
    (.join server)))

(defn -main   [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (start-webserver (config-property "http.port" 8080))
  (log/info "end run."))


(defn dump-git-markdowns []
  (let [repo (.build (.setWorkTree (org.eclipse.jgit.storage.file.FileRepositoryBuilder.) (java.io.File. ".")))
        head (.getRef repo "refs/heads/master")]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (org.eclipse.jgit.treewalk.TreeWalk. repo)]
          (.addTree tree-walk tree)
          (.setRecursive tree-walk true)
          (while (.next tree-walk)
            (when (.endsWith (.getPathString tree-walk) ".md")
              (println ">>> " (.getPathString tree-walk))
              (let [object-id (.getObjectId tree-walk 0)
                    loader (.open repo object-id)]
                (.copyTo loader System/out)))))))))




