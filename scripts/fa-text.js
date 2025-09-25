/* eslint-disable */
/* @ts-nocheck */
(function () {
    var root = document.getElementById("articleBody");
    if (!root) return;

    var faMap = { "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹" };
    function toFa(s) { return s.replace(/[0-9]/g, function (d) { return faMap[d] || d; }); }
    function rmHalf(s) { return s.replace(/[\u200c\u202f]/g, " "); }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) { n.nodeValue = rmHalf(toFa(n.nodeValue)); });
})();
