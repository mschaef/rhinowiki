;; Copyright (c) 2015-2025 Michael Schaeffer (dba East Coast Toolworks)
;;
;; Licensed as below.
;;
;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;       http://www.apache.org/licenses/LICENSE-2.0
;;
;; The license is also includes at the root of the project in the file
;; LICENSE.
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.
;;
;; You must not remove this notice, or any other, from this software.

(ns rhinowiki.site
  (:use compojure.core
        playbook.core
        rhinowiki.utils)
  (:require [taoensso.timbre :as log]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [hiccup.util :as hiccup-util]
            [playbook.config :as config]
            [rhinowiki.parser :as parser]
            [rhinowiki.blog :as blog]
            [rhinowiki.feeds :as feeds]))

;;;; Web Site

(defn- url-query [path params]
  (str path (if (> (count params) 0)
              (str "?" (clojure.string/join "&" (map (fn [[k v]] (str (name k) "=" v)) params)))
              "")))

(defn- blog-heading [blog]
  [:div.header
   [:a {:href "/"}
    [:h1
     (:blog-title blog)
     (when (:development-mode blog)
       [:span.tag.dev "DEV"])]]
   [:div.links
    (map (fn [link]
           [:a {:href (:link link) :target "_blank"}
            (or
             (when-let [icon (:fa-icon link)]
               [:i {:class (str "fa " icon)
                    :title (:label link)}])
             (:label link)
             "No icon or label specified.")])
         (or (:header-links blog) []))]])

(defn- site-page [blog page-title body]
  (hiccup/html
   [:html
    [:head
     [:meta {:name "viewport"
             :content "width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0"}]
     [:link {:rel "alternate" :type "application/atom+xml" :href (str (:base-url blog) "/feed/atom") :title "Atom Feed"}]
     [:link {:rel "alternate" :type "application/rss+xml" :href (str (:base-url blog) "/feed/rss") :title "RSS Feed"}]
     (page/include-css (resource-path "style.css")
                       (resource-path "font-awesome.min.css"))
     [:title
      (when (:development-mode blog) "DEV - ")
      (if page-title
        (str page-title " - " (:blog-title blog))
        (:blog-title blog))]]
    [:body
     (blog-heading blog)
     body
     [:div.footer
      (:blog-copyright blog)
      [:span.item
       [:a {:href "/feed/atom"} "[atom]"]
       [:a {:href "/feed/rss"} "[rss]"]
       [:a {:href "/contents"} "[contents]"]]
      [:div.item
       "Made with "
       [:a {:href (config/cval :rhinowiki-repository)} "Rhinowiki " (get-version)]]]]]))

(defn- article-sponsor [blog article]
  (get-in blog [:sponsors (:sponsor article)]))

(defn- article-sponsor-block [blog article]
  (when-let [sponsor (article-sponsor blog article)]
    [:div.sponsor
     "Written with sponsorship by " [:a {:href (:link sponsor) :target "_blank"} (:long-name sponsor) "."]]))

(defn- article-tags [blog article]
  (when (> (count (:tags article)) 0)
    [:div.tags
     "Tags:"
     (map (fn [tag]
            [:span.tag
             [:a {:href (url-query "/" {:tag tag})} tag]])
          (sort (:tags article)))]))

(defn- article-block [blog article summarize?]
  [:div.article
   [:div.date
    (.format (:article-header (:date-format blog)) (:date article))]
   [:div.title
    [:a {:href (:permalink article)}
     (:title article)]]
   (let [short-html (and summarize?
                         (parser/article-short-html article))]
     [:div.article-content
      (article-sponsor-block blog article)
      (or short-html
          (parser/article-content-html article))
      (when short-html
        [:div.read-more
         [:a.feed-navigation {:href (:permalink article)}
          "Read More..."]])
      (article-tags blog article)])])

(defn- article-page [blog article-name]
  (when-let [article-info (blog/article-by-name blog article-name)]
    (site-page blog
               (:title article-info)
               [:div (article-block blog article-info false)])))

(defn- file-response [blog file-name]
  (when-let [file-info (blog/file-by-name blog file-name)]
    (java.io.ByteArrayInputStream. (:content-raw file-info))))

(defn- tag-query-block [tag]
  (when tag
    [:div.query
     "Articles with tag: "
     [:span.tag (hiccup-util/escape-html tag)]]))

(defn- articles-page [blog start tag]
  (let [display-articles (blog/blog-display-articles blog start tag (:recent-post-limit blog))]
    (site-page blog
               nil
               [:div.articles
                (tag-query-block tag)
                (map #(article-block blog % true) display-articles)
                [:div.feed-navigation
                 (unless (< (count display-articles) (:recent-post-limit blog))
                         [:a {:href (url-query "/" (cond-> {:start (+ start (:recent-post-limit blog))}
                                                     tag (assoc :tag tag)))}
                          "Older Articles..."])]])))

(defn- contents-block [blog article]
  [:div
   [:a
    {:href (:permalink article)}
    (:title article)]])

(defn- group-by-date-header [blog articles]
  (partition-by :date-header
                (map #(assoc % :date-header (.format (:contents-header (:date-format blog)) (:date %)))
                     articles)))

(defn- contents-page-article-entry [blog article]
  [:div.entry
   [:a {:href (:permalink article)}
    (:title article)]
   (when-let [sponsor (article-sponsor blog article)]
     [:span.sponsor
      "sponsor: " [:a {:href (:link sponsor) :target "_blank"} (:short-name sponsor)]])])

(defn- contents-page [blog start tag]
  (let [display-articles (blog/blog-display-articles blog start tag (:contents-post-limit blog))
        display-article-blocks (group-by-date-header blog display-articles)]
    (site-page blog
               "Table of Contents"
               [:div.contents
                (tag-query-block tag)
                [:div.subtitle "Table of Contents"]
                [:div.blocks
                 (map (fn [block]
                        [:div.block
                         [:div.header
                          (:date-header (first block))]
                         [:div.articles
                          (map #(contents-page-article-entry blog %) block)]])
                      display-article-blocks)]
                [:div.feed-navigation
                 (unless (< (count display-articles) (:contents-post-limit blog))
                         [:a {:href (url-query "/contents" (cond-> {:start (+ start (:contents-post-limit blog))}
                                                             tag (assoc :tag tag)))}
                          "Older Articles..."])]])))

;;;; Blog Routing

(defn blog-routes [blog]
  (routes
   (GET "/" [start tag]
     (articles-page blog (or (try-parse-integer start) 0) tag))

   (GET "/contents" [start tag]
     (contents-page blog (or (try-parse-integer start) 0) tag))

   (feeds/feed-routes blog)

   (POST "/invalidate" []
     (blog/invalidate-cache blog)
     "invalidated")

   (GET "/*" {params :params}
     (article-page blog (:* params)))

   (GET "/*" {params :params}
     (file-response blog (:* params)))))
