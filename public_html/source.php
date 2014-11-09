<?php
  function h($s) {
    echo htmlspecialchars($s, ENT_COMPAT, 'UTF-8');
  }

  $filename = isset($_GET['src']) ? $_GET['src'] : null;
  if ($filename && !(preg_match('/^[a-z]+\.(js|html)$/', $filename) && file_exists($filename)))
    $filename = null;
  
?>
<!DOCTYPE html>
<html>
  <head>
    <title>Source <?php h($filename); ?></title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body {
        background-color: #000;
      }
    </style>
    <link rel="stylesheet" href="js/highlighter/styles/sunburst.css">
    <script src="js/highlighter/highlight.pack.js"></script>
    <script>hljs.initHighlightingOnLoad();</script>
  </head>
  <body>
    <pre><code><?php h(file_get_contents($filename)); ?></code></pre>
  </body>
</html>

