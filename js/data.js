var ob = ob || {};
ob.data = ob.data || {};

;(function (namespace, undefined) {
	namespace.hierarchy = function() {

		/* helper function for preparing data for visualization */
		function _prepare_recurse(node) {
			/* nodes need to have 'children' in order to work with calls to 
			   d3.layout.partition
			 */

			/* hold sum of child values */
			var value = 0.0;

			/* recurse through children of node */
			node.children.forEach(function(child) {
				/* 'values' either contains the budget amount for a node, 
				   or it contains a list of sub nodes.  This code checks
				   whether 'values' is an array or a number.  If it is a 
				   number it accumulates it, otherwise it continues to 
				   process the children
				 */
				if (child.hasOwnProperty('values')) {
					if (isNaN(child.values)) {
						if (child.values instanceof Array) {
							/* for visualization code, need to set children variable */
							child.children = child.values;
							value += _prepare_recurse(child);
						}
					}
					else {
						/* parse integer of child values */
						child.value = parseFloat(child.values);
						value += child.value;
					}
				}
			});

			/* assign the value for this node as the sum of the child values */
			node.value = value;

			/* sort child values */
			node.children.sort(function(a, b) {
				return b.value - a.value;
			});

			/* return this nodes value */
			return value;
		}
		
		/* process the return to d3.nest so that it can be displayed */
		function _prepare(data) {
			var root = {
				key: 'Budget',
				children: data
			};
			_prepare_recurse(root);
			return root;
		}

		return {
			crunch: function(rows) {
				/* d3.nest takes the row data given by fusion tables and converts it into 
				   hierarchical data needed for our visualization.  Accumulate 
				   and nest data to depth determined by 'heirarchy' 
				 */
				var nest = d3.nest();
				d3.range(hierarchy.length)
					.forEach(function(i) {
						/* recursively apply hierarchy keys */
						nest = nest.key(function(d) { return d[i]; });
					});

				/* when rolling up child data into group, sum their values */
				nest = nest.rollup(function(d) { 
					var sum = 0.0;
					d.forEach(function(x) {
						sum += parseFloat(x[3]);
					});
					return sum;
				}).entries(rows);


				/* prepare data for visualization */
				var root = _prepare(nest);
				/* remove lowest funds */
				root.values = root.children;
				return root;
			},
			spelunk: function(root, keys) {
				var node = root;
				/* make copy of keys */
				var p = keys.slice();
				while (p.length > 0) {
					var next_key = p.shift();
					var next_node = null;
					node.children.forEach(function(c) {
						if (c.key == next_key) {
							next_node = c
						}
					});
					if (!next_node) {
						return node;
					}
					node = next_node;
				}
				return node;
			},
			path: function(node) {
				var p = [];
				while (node.parent) {
					p.push(node.key);
					node = node.parent;
				}
				p.reverse();
				return p;
			},
			apply: function(node, func) {
				var self = this;
				func(node);
				if (node.children) {
					node.children.forEach(function(x) {
						self.apply(x, func);
					});
				}
			}
		}
	}
})(ob.data);

