var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var htmlToVdom = require('html-to-vdom')({ VNode: VNode, VText: VText });

function htmlToPlastiq(html) {
  var vtree = htmlToVdom(html);
  return generateRenderFunctionFromVTree(vtree);
}
module.exports = htmlToPlastiq;

function plastiqifyVNode(vnode) {
  if (vnode.length) {
    return plastiqifyVNode(vnode[0]);
  }
  if (vnode.tagName) {
    return { selector: selectorFor(vnode), arguments: plastiqHtmlArgumentsFor(vnode) };
  } else {
    return vnode.text;
  }
}

function selectorFor(vnode) {
  var selector = vnode.tagName;
  if (vnode.properties && vnode.properties.id) {
    selector += '#' + vnode.properties.id;
  }
  return selector + classesFor(vnode);
}

function plastiqHtmlArgumentsFor(vnode) {
  return attributesOf(vnode).concat(removeWhitespaces(plastiqifyChildrenOf(vnode)));
}

function removeWhitespaces(arguments) {
  return arguments.filter(function(a) { return !/^\s*$/g.test(a); })
}

function classesFor(vnode) {
  if (vnode.properties && vnode.properties.attributes && vnode.properties.attributes['class']) {
    return "." + vnode.properties.attributes['class'].split(' ').join(".");
  } else {
    return '';
  }
}

function attributesOf(vnode) {
  if (vnode.properties) {
    var keys = Object.keys(vnode.properties);
    var v = {};
    for (var k = 0; k < keys.length; ++k) {
      v[keys[k]] =  vnode.properties[keys[k]];
    }
    delete(v.id);
    if (v.attributes) {
      delete(v.attributes.class);
      if (Object.keys(v.attributes).length == 0) {
        delete(v.attributes);
      }
    }
    if (Object.keys(v).length > 0) {
      return [v];
    }
  }
  return [];
}

function plastiqifyChildrenOf(vnode) {
  if (vnode.children) {
    return vnode.children.map(function(child) {
      return plastiqifyVNode(child);
    });
  } else {
    return [plastiqifyVNode(vnode)];
  }
}

function callPlastiqHtml(m, indent) {
  return spaces(indent) + 'h(' + [JSON.stringify(m.selector)].concat((m.arguments || []).map(function(a) {
    return (typeof(a) == 'string' || !a.selector) ? jsify(a) : callPlastiqHtml(a, indent + 1);
  })).join(", ") + ")";
}

function spaces(indent) {
  return "\n" + Array(indent).join("  ");
}

function jsify(arg) {
  if (typeof(arg) == 'string') {
    return JSON.stringify(arg);
  }
  return '{ ' + Object.keys(arg).map(function(k) {
    var key = /^[a-zA-Z0-9_]+$/.test(k) ? k : JSON.stringify(k);
    var val = typeof(arg[k]) == 'object' ? jsify(arg[k]) : JSON.stringify(arg[k]);
    return key + ': ' + val;
  }).join(', ') + ' }'
}

function generateRenderFunctionFromVTree(vtree) {
  var m = plastiqifyVNode(vtree);
  return "function render() {\n  return " + callPlastiqHtml(m, 2).substr(3) + "\n}";
}
