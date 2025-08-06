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

(ns rhinowiki.page
  (:use compojure.core
        playbook.core
        rhinowiki.utils)
  (:require [taoensso.timbre :as log]
            [hiccup.page :as hiccup-page]
            [playbook.config :as config]))

(defn- blog-header [blog]
  [:div.blog-header
   [:a.blog-title {:href "/"}
    [:h1
     (:title blog)
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

(defn- blog-footer [blog]
  [:div.blog-footer
   (:blog-copyright blog)
   [:span.item
    [:a {:href "/feed/atom"} "[atom]"]
    [:a {:href "/feed/rss"} "[rss]"]
    [:a {:href "/contents"} "[contents]"]]
   [:div.item
    "Made with "
    [:a {:href (config/cval :rhinowiki-repository)} "Rhinowiki " (get-version)]]])

(defn site-page [blog page-title body]
  (hiccup-page/html5
   {:lang (:language blog)}
   [:head
    [:meta {:name "viewport"
            :content "width=device-width, initial-scale=1.0"}]
    [:link {:rel "alternate" :type "application/atom+xml" :href (str (:base-url blog) "/feed/atom") :title "Atom Feed"}]
    [:link {:rel "alternate" :type "application/rss+xml" :href (str (:base-url blog) "/feed/rss") :title "RSS Feed"}]
    (hiccup-page/include-css (resource-path "style.css")
                             (resource-path "font-awesome.min.css"))
    [:title
     (when (:development-mode blog) "DEV - ")
     (if page-title
       (str (:title blog) " - " page-title)
       (:title blog))]]
   [:body
    (blog-header blog)
    body
    (blog-footer blog)]))

