(defproject rhinowiki "0.1.0-SNAPSHOT"
  :description "Rhinowiki Blog Engine"
  :url "http://www.mschaef.com"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.8.0"]]
  :main ^:skip-aot rhinowiki.core
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all}})
