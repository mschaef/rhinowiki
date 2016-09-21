title:Introductory Page
Subject: nothing of interest


Hello World

* this
* is
* a
* list

```clojure
(defn page [ title body ]
  (hiccup/html
   [:html
    [:head
     (page/include-css (resource "style.css"))
     (page/include-css (resource "rainbow.css"))
     (page/include-js (resource "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title title]]
    [:body
     [:h1 title]
     [:div.body
      body]]]))
```



