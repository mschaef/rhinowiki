(function () {
    var generation = null;

    function poll() {
        fetch('/dev/poll')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (generation === null) {
                    generation = data.generation;
                } else if (data.generation !== generation) {
                    location.reload();
                }
            })
            .catch(function () {})
            .finally(function () { setTimeout(poll, 1000); });
    }

    poll();
})();
