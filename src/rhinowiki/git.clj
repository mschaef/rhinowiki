(ns rhinowiki.git
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]))

(def git-hash-namespace #uuid "705adc91-9f5a-40d9-8960-d356dfe73402")

(defn git-object-uuid [ object-id ]
  (uuid/v5 git-hash-namespace
           (org.eclipse.jgit.lib.ObjectId/toString object-id)))

(defn tree-walk-seq [ tree-walk ]
  (if-let [next (.next tree-walk)]
    (let [path-string (.getPathString tree-walk)]
      (cons {:path-string path-string
             :name (.getName (java.io.File. path-string))
             :git-object-id (.getObjectId tree-walk 0)
             :id (git-object-uuid (.getObjectId tree-walk 0))}
            (lazy-seq (tree-walk-seq tree-walk))))
    ()))

(defn git-object-string [ repo object-id ]
  (let [loader (.open repo object-id)]
    (String. (.getBytes loader) "UTF-8")))

(defn recursive-tree-walk [ repo tree ]
  (let [tree-walk (org.eclipse.jgit.treewalk.TreeWalk. repo)]
    (.addTree tree-walk tree)
    (.setRecursive tree-walk true)
    tree-walk))

(defn git-items [ repo ref-name ]
  (let [head (.getRef repo ref-name)]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (recursive-tree-walk repo tree)]
          (doall (tree-walk-seq tree-walk)))))))

(defn git-markdowns [ repo ref-name article-root ]
  (map #(merge % {:content-raw (git-object-string repo (:git-object-id %))})
       (filter #(and
                 (.startsWith (:path-string %) article-root)
                 (.endsWith (:path-string %) ".md"))
               (git-items repo ref-name)))  )

(defn git-file-repo [ root ]
  (.build (.setWorkTree (org.eclipse.jgit.storage.file.FileRepositoryBuilder.) (java.io.File. root))))

(defn load-data-files [ & {:keys [ repo-path ref-name article-root]
                           :or {repo-path "."
                                ref-name "refs/heads/master"
                                article-root ""}}]
  (log/info "Loading data files.")
  (doall (git-markdowns (git-file-repo repo-path) ref-name article-root )))

