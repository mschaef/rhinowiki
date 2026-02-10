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

(ns rhinowiki.store.git
  (:use playbook.core)
  (:require [taoensso.timbre :as log]
            [clj-uuid :as uuid]
            [rhinowiki.store.core :as core]))

(def git-hash-namespace #uuid "705adc91-9f5a-40d9-8960-d356dfe73402")

(defn git-object-uuid [object-id]
  (uuid/v5 git-hash-namespace
           (org.eclipse.jgit.lib.ObjectId/toString object-id)))

(defn- tree-walk-seq [tree-walk]
  (when (.next tree-walk)
    (let [object-id (.getObjectId tree-walk 0)]
      (cons {:file-name (.getPathString tree-walk)
             :git-object-id object-id
             :id (git-object-uuid object-id)}
            (lazy-seq (tree-walk-seq tree-walk))))))

(defn- git-object-bytes [repo object-id]
  (let [loader (.open repo object-id)]
    (.getBytes loader)))

(defn- recursive-tree-walk [repo tree]
  (doto (org.eclipse.jgit.treewalk.TreeWalk. repo)
    (.addTree tree)
    (.setRecursive true)))

(defn- git-items [repo ref-name]
  (let [head (.getRef repo ref-name)]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (recursive-tree-walk repo tree)]
          (doall (tree-walk-seq tree-walk)))))))

(deftype GitStoreFile [repo file-name catalog-entry]
  core/StoreFile

  (-get-file-name [self]
    file-name)

  (-load-store-file [self]
    (merge catalog-entry
           {:content-raw (git-object-bytes repo (:git-object-id catalog-entry))})))

(defn- git-data-file-catalog [repo ref-name article-root]
  (map #(GitStoreFile. repo
                       (.substring (:file-name %) (.length article-root))
                       (merge % {:file-name (.substring (:file-name %) (.length article-root))}))
       (filter #(.startsWith (:file-name %) article-root)
               (git-items repo ref-name))))

(defn- git-file-bare-repo [root]
  (.build (doto (org.eclipse.jgit.storage.file.FileRepositoryBuilder.)
            (.setBare)
            (.setGitDir (java.io.File. root)))))

(defn- git-file-repo [root]
  (.build (doto (org.eclipse.jgit.storage.file.FileRepositoryBuilder.)
            (.setWorkTree (java.io.File. root)))))

(defn catalog-data-files [{:keys [repo-path ref-name article-root]
                           :or {repo-path "."
                                ref-name "refs/heads/master"
                                article-root ""}}]
  (log/info "Loading data files.")
  (doall (git-data-file-catalog (if (.endsWith repo-path ".git")
                                  (git-file-bare-repo repo-path)
                                  (git-file-repo repo-path))
                                ref-name article-root)))

(deftype GitStore [spec]
  core/Store

  (-catalog [self]
    (catalog-data-files spec)))

(defn create-store [spec]
  (GitStore. spec))
