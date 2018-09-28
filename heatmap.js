require('../../lib/stdlib.array.js');
require('../../lib/stdlib.String.js');
require('../../lib/stdlib.Array.stat.js');
require('../../lib/stdlib.Array.layout.js');
require('../../lib/stdlib.HTMLElement.js');
require('../../lib/stdlib.SVGElement.js');
require('../../lib/stdlib.HTMLFormElement.js');

var extend = require('util')._extend,
	figue = require('../../lib/figue.js'),
	saveAs = require('../../lib/FileSaver.js').saveAs;
	mytooltip = require('../../lib/mytooltip.js'),
	events_reg = require('../../lib/events_reg.js');

require('./heatmap.scss');
require('../../lib/mytooltip.scss');
/**
* create heatmap with hierachy trees and color map
* @constructor
* @version 0.0.1
* @param {DOM} view - nav dom already in html code
* @param {object.<string, number>} args - arguments for heatmap
*/
function self_mod(dom,args){
	this.doms={body:dom};
	this.mod = {};
	this.args = extend({
		color:['#59F2F7','#F75D59'],
		revise:{
			names:['z-score(column)','z-score(row)'],
			methods:[
				function(data){
					return {
						data:data.data.transpose().map(function(v){return v.z_scores()}).transpose(),
						colnames:data.colnames,
						rownames:data.rownames
					}
				},
				function(data){
					return {
						data:data.data.map(function(v){return v.z_scores()}),
						colnames:data.colnames,
						rownames:data.rownames
					}
				}
			],
			value:[] // z-score default index
		},
		width:400,
 		height:400
	},args);
	this.env = {sel_row:[]};
	this.init();
}
module.exports = self_mod;
/**
* init process
*/
self_mod.prototype.init = function(){
	this.doms_prep();
	this.dom_event();
}
/**
* prepare layout
*/
self_mod.prototype.doms_prep = function(){
	var self = this;
	this.doms.body.classList.add('heatmap');
	var t_svg = ['colDend','rowDend','colormap'].map(function(v){
		var t = SVGAElement.prototype.create_node('svg').set_attr('class',v);
		self.doms[v] = t;
		return t;
	})
	this.doms.body.append_by_array([
		{name:'div',attr:{class:'inner'},child:[
			{name:'div',attr:{class:'info'},child:[
				{name:'div',attr:{class:'colorbar'}},
				{name:'form',attr:{class:'f_control'},child:[
					{name:'input',attr:{type:'color',name:'c_low',title:'change color'}},
					{name:'input',attr:{type:'color',name:'c_high',title:'change color'}},
					{name:'input',attr:{name:'b_save',type:'button',value:'save data table'}},
					{name:'div',attr:{class:'div_revise'}}
				]}
			]}
		].concat(t_svg)}
	]);
	// reg in doms
	Array.prototype.slice.apply(this.doms.body.querySelectorAll('[class]')).map(function(v){
		self.doms[v.className] = v;
	});
	// tooltip
	this.mod.t_tip = new mytooltip();
}
/**
* prepare event
*/
self_mod.prototype.dom_event = function(){
	var self = this;
	// init zoomBehaviors
	this.zbehav = {};
	['col_d','row_d','cmap_x','cmap_y'].map(function(v){
		self.zbehav[v] = d3.behavior.zoom().scaleExtent([1, Infinity]);
	});
	// call zoomBehaviors
	d3.select(this.doms.colDend).call(this.zbehav.col_d);
 	d3.select(this.doms.rowDend).call(this.zbehav.row_d);
	self.cmap_zoom();
	// form event
	this.doms.f_control.b_save.onclick = function(e){self.data_save(e)};
	this.doms.f_control.onchange = function(e){
		self.re_plot();
	};
	// cmap event
	this.cmap_e = new events_reg(this.doms.colormap);
	this.cmap_e.events.mouseover = {
		'rect.datapt':function(e){
			// tooltip show
			var ir = self.env.mat_clus.row_ind[e.target.rowIndex],
				ic = self.env.mat_clus.col_ind[e.target.colIndex];
			self.mod.t_tip.show(e.target,[{name:'div',html:self.tip_html(ir,ic,self.env.t_data)}]);
			self.doms.body.classList.add('highlighting');
			self.env.col_dend.leaves[e.target.colIndex].classList.add('active');
			self.env.row_dend.leaves[e.target.rowIndex].classList.add('active');
		}
	};
	this.cmap_e.events.mouseout = {
		'rect.datapt':function(e){
			// tooltip hide
			self.mod.t_tip.hide();
			self.doms.body.classList.remove('highlighting');
			self.env.col_dend.leaves[e.target.colIndex].classList.remove('active');
			self.env.row_dend.leaves[e.target.rowIndex].classList.remove('active');
		}
	}
	this.cmap_e.events.click = {
		'rect.datapt':function(e){
			self.env.row_dend.leaves[e.target.rowIndex].classList.toggle('select');
			self.sel_data_ck();
		}
	}
	this.cmap_e.register();
}
/**
* create heatmap with hierachy trees and color map
* @param {object} data - with colnames, rownames and data matrix
* @return {object} re_plot object
*/
self_mod.prototype.plot = function(data){
	if(this.doms.div_revise.children.length==0){
		this.default_set();
	}
	return this.re_plot(data);
}
/**
* prepare default setting for plot function
*/
self_mod.prototype.default_set = function(){
	var self = this;
	// color set
	['c_low','c_high'].map(function(v,ind){
		self.doms.f_control[v].value = self.args.color[ind];
	});
	// revise input set
	var a_rev = [];
	this.args.revise.names.map(function(v,ind){
		a_rev = a_rev.concat([{name:'span',child:[
			{name:'input',attr:{type:'checkbox',name:'revise_ck',value:ind}},
			v
		]},{name:'br'}]);
	});
	this.doms.div_revise.append_by_array(a_rev);
	this.doms.f_control.val({revise_ck:this.args.revise.value});
}
/**
* real plot main function
* @param {object} [data] - nav dom already in html code
* @return {object} re_plot object
*/
self_mod.prototype.re_plot = function(data){
	var self = this;
	if(data){
		this.env.data = data;
	}
	this.env.args = this.doms.f_control.val();
	// data pre_process
	this.env.t_data = this.data_revise();
	// layout
	this.layout_ck();
	// colorbar
	this.colorbar();
	// tree clust
	this.env.mat_clus = this.matrix_cluster();
	// dendrogram
	['col','row'].map(function(v){
		self.env[v+'_dend'] = self.dendrogram(v);
	});
	// colormap
	self.env.cmap = self.colormap();
	// remap selected
	if(this.env.sel_row.length){
		this.sel_locale();
	}
}
/**
* count layout and set dimension
*/
self_mod.prototype.layout_ck = function(){
	var nrow_len = this.env.t_data.rownames.reduce(function(a,b){return b.length>a ? b.length:a;},0),
		ncol_len = this.env.t_data.colnames.reduce(function(a,b){return b.length>a ? b.length:a;},0);
	// check current dim
	var self=this,
		t_dim = this.doms.body.getBoundingClientRect();
	// count layout
	var w_info = 110+(nrow_len*7),
		h_info = 110+(ncol_len*7),
		w_cmap = t_dim.width - w_info,
		h_cmap = t_dim.height - h_info;
	// setting
	var t_coll = [[0,0,w_info,h_info],[0,w_info,w_cmap,h_info],
		[h_info,0,w_info,h_cmap],[h_info,w_info,w_cmap,h_cmap]];
	['info','colDend','rowDend','colormap'].map(function(v,ind){
		self.doms[v].style.top = t_coll[ind][0]+"px";
		self.doms[v].style.left = t_coll[ind][1]+"px";
		self.doms[v].style.width = t_coll[ind][2]+"px";
		self.doms[v].style.height = t_coll[ind][3]+"px";
	});
}
/**
* check revise args and process data to env.t_data
*/
self_mod.prototype.data_revise = function(){
	var self=this,
		t_data = this.env.data,
		rev_ind = this.env.args.revise_ck;
	rev_ind.map(function(v){
		t_data = self.args.revise.methods[v](t_data);
	});
	return t_data;
}
/**
* generate color function and colorbar
*/
self_mod.prototype.colorbar = function(){
	// find min and max
	var self = this;
	['min','max'].map(function(v){
		self.env[v] = Math[v].apply(null,self.env.t_data.data.map(function(v_1){
			return Math[v].apply(null,v_1);
		}));
	});
	this.color = d3.scale.linear().domain([this.env.min,this.env.max])
		.range([this.env.args.c_low,this.env.args.c_high]);
	// render start
	this.doms.colorbar.innerHTML = '';
	var bar_svg = SVGAElement.prototype.create_node('svg',{style:'width:200px;height:40px'});
	this.doms.colorbar.appendChild(bar_svg);
	var t_dom,intv = (this.env.max-this.env.min)*0.1;
	Array.prototype.range(10).map(function(v){
		var t_val = self.env.min+(intv*v);
		bar_svg.appendChild(bar_svg.create_node('rect',
			{style:'stroke-width:0;fill:'+self.color(t_val),width:15,height:15, x:15*(v+1)}
		));
		if([0,5].intersect([v]).length){
			t_dom = bar_svg.create_node('text',{x:15*v,y:30});
			t_dom.innerHTML = t_val.toExponential(1);
			bar_svg.appendChild(t_dom);
		}
	});
	// add final label
	t_dom = bar_svg.create_node('text',{x:15*10,y:30});
	t_dom.innerHTML = this.env.max.toExponential(1);
	bar_svg.appendChild(t_dom);
}
/**
* generate trees
*/
self_mod.prototype.matrix_cluster = function(){
	// root2tree
	function root2tree(root,name,ind) {
		if (root.label != -1) {
			ind.push(root.label);
			return {name: name[root.label]};
		}else{
			return {children: [root2tree(root.left,name,ind), root2tree(root.right,name,ind)]};
		}
	}
	var data = this.env.t_data,
		res = {},
		t_root,
		r_data;
	['row','col'].map(function(v){
		r_data = v=='row' ? data.data: data.data.transpose();
		t_root = figue.agglomerate(data[v+'names'].range(),r_data,figue.EUCLIDIAN_DISTANCE, figue.COMPLETE_LINKAGE);
		var t_rind = []
		res[v+'_tree'] = root2tree(t_root,data[v+'names'],t_rind);
		res[v+'_ind'] = t_rind;
	});
	return res;
}
/**
* plot dendrogram
*/
self_mod.prototype.dendrogram = function(d_type){
	var t_dom = this.doms[d_type+'Dend'],
		svg = d3.select(t_dom),
		data = this.env.mat_clus[d_type+'_tree'],
		s_ind = this.env.mat_clus[d_type+'_ind'],
		zbehav = this.zbehav[d_type+'_d'],
		t_dim = t_dom.getBoundingClientRect(),
		x = d3.scale.linear(),y = d3.scale.linear(),
		width,height,tree_h,transform;
	if(d_type=='col'){
		tree_h = width = t_dim.width, height = 250;
		x.range([1, 0]);
		transform = "rotate(-90," + height/2 + "," + height/2 + ") translate(240, 0)";
	}else{
		width = 250, tree_h = height = t_dim.height;
		transform = "translate(10, 0)";
	}
	y.domain([0, height]).range([0, height]);
	zbehav[d_type=='col' ? 'x':'y'](y);
	var cluster = d3.layout.cluster().separation(function(a, b) { return 1; }).size([tree_h,90]),
		nodes = cluster.nodes(data),
		links = cluster.links(nodes);
	// setup svg
	t_dom.empty();
	svg = svg
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", transform);
	// draw function
	function draw(){
		if (d3.event) {
			var t = d3.event.translate;
			var s = d3.event.scale;
			if (d_type=='col'){
				t[0] = Math.max(-width * (s - 1), Math.min(0, t[0]));
			}else{
				t[1] = Math.max(-height * (s - 1), Math.min(0, t[1]));
			}
			zbehav.translate(t);
		}
		function elbow(d, i) {
			return x(d.source.y) + "," + y(d.source.x) + " " +
				x(d.source.y) + "," + y(d.target.x) + " " +
				x(d.target.y) + "," + y(d.target.x);
		}
		var link = svg.selectAll(".link")
			.data(links)
			.attr("points", elbow)
			.enter().append("polyline")
			.attr("class", "link")
			.attr("points", elbow);
		//
		var node = svg.selectAll(".node")
			.data(nodes)
			.attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; });
		//
		var anchor = d_type=='col' ? "end" : "start",
			dx = d_type=='col' ? -3 : 3;
		//
		var leafNode = node.filter(function(d, i){ return !d.children; })
			.property("ind",function(d, i){return s_ind[i]})
			.append("text")
			.attr("dx", dx)
			.attr("dy", 3)
			.style("text-anchor", anchor)
			.text(function(d) { return d.name; });
		return leafNode;
	}
	var leaves = draw();
	return {draw: draw,leaves: leaves[0]};
}
/**
* plot colormap, return draw function
*/
self_mod.prototype.colormap = function(){
	var self = this,
		svg = d3.select(this.doms.colormap),
		t_dim = this.doms.colormap.getBoundingClientRect(),
		width = t_dim.width,
		height = t_dim.height,
		data = this.env.t_data,
		ncol = data.colnames.length,
		nrow = data.rownames.length,
		mat_clus = this.env.mat_clus;
	// get sorted data
	var s_data = mat_clus.row_ind.reduce(function(a,b){
		return a.concat(mat_clus.col_ind.reduce(function(a_1,b_1){
			return a_1.concat(data.data[b][b_1]);
		},[]));
	},[]);
	// zoom Behavior
	var x = d3.scale.linear().domain([0, ncol]).range([0, width]),
		y = d3.scale.linear().domain([0, nrow]).range([0, height]);
	this.zbehav.cmap_x.x(x);
	this.zbehav.cmap_y.y(y);

	// fill color
	svg = svg.attr("width", width).attr("height", height).append("g");
	var rect = svg.selectAll("rect").data(s_data);
	rect.enter().append("rect").classed("datapt", true);
 	rect.exit().remove();
	rect
		.property("colIndex", function(d, i) { return i % ncol; })
		.property("rowIndex", function(d, i) { return Math.floor(i / ncol); })
		.attr("x", function(d, i) {
			return x(i % ncol);
		})
		.attr("y", function(d, i) {
			return y(Math.floor(i / ncol));
		})
		.attr("width", x(1))
		.attr("height", y(1))
		.attr("fill", function(d) { return self.color(d); });
	// draw
	function draw() {
 		var t = [self.zbehav.cmap_x.translate()[0], self.zbehav.cmap_y.translate()[1]];
 		var s = [self.zbehav.cmap_x.scale(), self.zbehav.cmap_y.scale()];
 		svg.attr("transform", "translate(" + t[0] + " " + t[1] + ") " + "scale(" + s[0] + " " + s[1] + ")");
 	}
	draw();
	return {draw: draw};
}
/**
* zoom_setup
*/
self_mod.prototype.cmap_zoom = function(){
	var self = this;
	function updateColormapZoom(){
		self.zbehav.cmap_x.scale(self.zbehav.col_d.scale());
		self.zbehav.cmap_y.scale(self.zbehav.row_d.scale());
		self.zbehav.cmap_x.translate(self.zbehav.col_d.translate());
		self.zbehav.cmap_y.translate(self.zbehav.row_d.translate());
		self.env.cmap.draw();
	}
	this.zbehav.col_d.on("zoom", function(){
 		self.env.col_dend.draw();
 		updateColormapZoom()
 	});
	this.zbehav.row_d.on("zoom", function(){
 		self.env.row_dend.draw();
 		updateColormapZoom()
 	});
}
/**
 * function for table data check and change notification
 */
self_mod.prototype.sel_data_ck = function(){
	var sel_dom = this.doms.rowDend.querySelectorAll('.select');
	this.env.sel_row = Array.prototype.slice.apply(sel_dom).map(function(v){
		return v.parentNode.ind;
	});
	if(this.env.sel_row.length){
		this.doms.f_control.b_save.value = 'save selected data['+this.env.sel_row.length+']';
	}else{
		this.doms.f_control.b_save.value = 'save data table';
	}
}
/**
 * function for table data check and change notification
 */
self_mod.prototype.data_save = function(e){
	var data = this.env.data,s_data=[],s_rows=[];
	if(this.env.sel_row.length){
		this.env.sel_row.map(function(v){
			s_data.push(data.data[v]);
			s_rows.push(data.rownames[v]);
		});
	}else{
		s_data = data.data,
		s_rows = data.rownames;
	}
	saveAs(new Blob([
		[s_rows].concat(s_data.transpose()).transpose().to_table([''].concat(data.colnames))
	],{type: "text/plain;charset=utf-8"}), 'data.csv' );
}
/**
 * highlight selected item after replot
 */
self_mod.prototype.sel_locale = function(){
	var inds = this.env.mat_clus.row_ind,
		t_ind,
		t_texts = this.doms.rowDend.querySelectorAll('g.node>text');
	this.env.sel_row.map(function(v){
		t_ind = inds.indexOf(v);
		if(t_ind!=-1){
			t_texts[t_ind].classList.add('select');
		}
	});
}
/**
 * highlight selected item after replot
 */
self_mod.prototype.tip_html = function(irow,icol,data){
	return [
		['rowname',data.rownames[irow]],
		['colname',data.colnames[icol]],
		['data',data.data[irow][icol]]
	].map(function(v){
		return v.join(':');
	}).join('<br/>');
}
