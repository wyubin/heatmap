# heatmap.js
## Introduction
Generate a heatmap by d3js function.

The [Demo][] page

## Requirements
No.

And you need to require css and js of heatmap when you use it in browser.
```js
<script src="heatmap.min.js"></script>
<link rel="stylesheet" type="text/css" href="heatmap.min.css">
```

## Usage
### Create a plot
1. set up a html container for table plot.(like a div with a *"simple_form"* id)
```js
<div id="heatmap" style='width:600;height:600'></div>
```
2. render it by adding a array including json object like below
```js
var data={"rownames":['descript of a','description of b','description of c','empty'],
	"colnames":['2011','2012','2013'],
	"data":[[5.5,70,-1],[6,50.3,7],[-9,100,10],[0,0,0]]
};
var heatmap_div = new heatmap($('#heatmap')[0]);
heatmap_div.plot(data);
```

## Change logs
* 0.0.1

	Initiate the project and a base function

[demo]:	http://wyubin.github.io/heatmap/
