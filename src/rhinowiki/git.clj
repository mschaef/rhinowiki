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
      (cons {:file-name path-string
             :git-object-id (.getObjectId tree-walk 0)
             :id (git-object-uuid (.getObjectId tree-walk 0))}
            (lazy-seq (tree-walk-seq tree-walk))))
    ()))

(defn git-object-bytes [ repo object-id ]
  (let [loader (.open repo object-id)]
    (.getBytes loader)))

(defn recursive-tree-walk [ repo tree ]
  (doto (org.eclipse.jgit.treewalk.TreeWalk. repo)
    (.addTree tree)
    (.setRecursive true)))

(defn git-items [ repo ref-name ]
  (let [head (.getRef repo ref-name)]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (recursive-tree-walk repo tree)]
          (doall (tree-walk-seq tree-walk)))))))

(defn git-data-files [ repo ref-name article-root ]
  (map #(merge % {:content-raw (git-object-bytes repo (:git-object-id %))
                  :file-name (.substring (:file-name %) (.length article-root))})
       (filter #(.startsWith (:file-name %) article-root)
               (git-items repo ref-name))))

(defn git-file-bare-repo [ root ]
  (.build (doto (org.eclipse.jgit.storage.file.FileRepositoryBuilder.)
            (.setBare)
            (.setGitDir (java.io.File. root)))))

(defn git-file-repo [ root ]
  (.build (doto (org.eclipse.jgit.storage.file.FileRepositoryBuilder.)
            (.setWorkDir (java.io.File. root)))))

(defn load-data-files [ & {:keys [ repo-path ref-name article-root ]
                           :or {repo-path "."
                                ref-name "refs/heads/master"
                                article-root ""}}]
  (log/info "Loading data files.")
  (doall (git-data-files (if (.endsWith repo-path ".git")
                           (git-file-bare-repo repo-path)
                           (git-file-repo repo-path))
                         ref-name article-root)))

