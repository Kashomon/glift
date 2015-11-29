goog.provide('glift.displays.svg.SvgObj');

/**
 * Creats a SVG Wrapper object.
 *
 * @param {string} type Svg element type.
 * @param {Object=} opt_attrObj optional attribute object.
 */
glift.displays.svg.createObj = function(type, opt_attrObj) {
   return new glift.displays.svg.SvgObj(type, opt_attrObj);
};

/**
 * Creates a root SVG object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.svg = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('svg', opt_attrObj)
      .setAttr('version', '1.1')
      .setAttr('xmlns', 'http://www.w3.org/2000/svg');
};

/**
 * Creates a circle svg object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.circle = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('circle', opt_attrObj);
};

/**
 * Creates a path svg object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.path = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('path', opt_attrObj);
};

/**
 * Creates an rectangle svg object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.rect = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('rect', opt_attrObj);
};

/**
 * Creates an image svg object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.image = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('image', opt_attrObj);
};

/**
 * Creates a text svg object.
 * @param {Object=} opt_attrObj optional attribute object.
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.text = function(opt_attrObj) {
  return new glift.displays.svg.SvgObj('text', opt_attrObj);
};

/**
 * Create a group object (without any attributes)
 * @return {!glift.displays.svg.SvgObj}
 */
glift.displays.svg.group = function() {
  return new glift.displays.svg.SvgObj('g');
};

/**
 * SVG Wrapper object.
 * @constructor @final @struct
 *
 * @param {string} type Svg element type.
 * @param {Object=} opt_attrObj optional attribute object.
 */
glift.displays.svg.SvgObj = function(type, opt_attrObj) {
  /** @private {string} */
  this.type_ = type;
  /** @private {Object} */
  this.attrMap_ = opt_attrObj || {};
  /** @private {!Array<!glift.displays.svg.SvgObj>} */
  this.children_ = [];
  /** @private {Object<!glift.displays.svg.SvgObj>} */
  this.idMap_ = {};
  /** @private {string} */
  this.text_ = '';
  /** @private {Object} */
  this.data_ = undefined;
};

glift.displays.svg.SvgObj.prototype = {
  /**
   * Attach content to a div.
   * @param {string} divId}
   */
  attachToParent: function(divId) {
    var svgContainer = document.getElementById(divId);
    if (svgContainer) {
      svgContainer.appendChild(this.asElement());
    }
  },

  /**
   * Remove from the element from the DOM.
   * @return {!glift.displays.svg.SvgObj} this object.
   */
  removeFromDom: function() {
    if (this.attr('id')) {
      var elem = document.getElementById(this.attr('id'));
      if (elem) { elem.parentNode.removeChild(elem); }
    }
    return this;
  },

  /**
   * Turn this node (and all children nodes) into SVG elements.
   * @return {Element} Dom element.
   */
  asElement: function() {
    var elem = document.createElementNS(
        "http://www.w3.org/2000/svg", this.type_);
    for (var attr in this.attrMap_) {
      if (attr === 'xlink:href') {
        elem.setAttributeNS(
            'http://www.w3.org/1999/xlink', 'href', this.attrMap_[attr]);
      } else {
        elem.setAttribute(attr, this.attrMap_[attr]);
      }
    }
    if (this.type_ === 'text') {
      var textNode = document.createTextNode(this.text_);
      elem.appendChild(textNode);
    }
    for (var i = 0, len = this.children_.length; i < len; i++) {
      elem.appendChild(this.children_[i].asElement());
    }
    return elem;
  },

  /**
   * Return the string form of the svg object.
   * @return {string}
   */
  render: function() {
    var base = '<' + this.type_;
    for (var key in this.attrMap_) {
      base += ' ' + key + '="' + this.attrMap_[key] + '"';
    }
    base += '>' + this.text_;
    if (this.children_.length > 0) {
      var baseBuffer = [base];
      for (var i = 0, ii = this.children_.length; i < ii; i++) {
        baseBuffer.push(this.children_[i].render());
      }
      baseBuffer.push('</' + this.type_ + '>');
      base = baseBuffer.join("\n");
    } else {
      base += '</' + this.type_ + '>';
    }
    return base;
  },

  /** @return {*} A value in the attribute map. */
  attr: function(key) {
    return this.attrMap_[key];
  },

  /**
   * Sets an SVG attribute.
   * @param {string} key The key of an object in the map.
   * @param {*} value The value to set in the map.
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  setAttr: function(key, value) {
    this.attrMap_[key] = value;
    return this;
  },

  /** @return {Object} The attribute object.  */
  attrObj: function(opt_obj) {
    return this.attrMap_;
  },

  /**
   * Sets the entire attribute object.
   * @param {Object} attrObj
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  setAttrObj: function(attrObj) {
    if (glift.util.typeOf(attrObj) !== 'object') {
      throw new Error('Attr obj must be of type object');
    }
    this.attrMap_ = attrObj;
    return this;
  },

  /**
   * Update a particular attribute in the DOM.
   * @param {string} attr
   */
  updateAttrInDom: function(attr) {
    var elem = document.getElementById(this.attr('id'))
    if (elem && attr && this.attr(attr)) {
      elem.setAttribute(attr, this.attr(attr));
    }
    return this;
  },

  /** @return {Object} The node's data */
  data: function(data) {
    return this.data_
  },

  /**
   * Set some internal data. Note: this data is not attached when the element is
   * generated.
   * @param {Object} data
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  setData: function(data) {
    this.data_ = data;
    return this;
  },

  /** @return {string} The text on the node. */
  text: function(text) {
    return this.text_;
  },

  /**
   * Append some text. Usually only for text elements.
   * @param {string} text
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  setText: function(text) {
    this.text_ = text;
    return this;
  },

  /**
   * Get child from an Id.
   * @return {!glift.displays.svg.SvgObj} The child obj.
   */
  child: function(id) {
    return this.idMap_[id];
  },

  /**
   * Remove child, based on id.
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  rmChild: function(id) {
    delete this.idMap_[id];
    return this;
  },

  /**
   * Get all the Children.
   * @return {!Array<glift.displays.svg.SvgObj>}
   */
  children: function() {
    return this.children_;
  },

  /**
   * Empty out all the children.
   * @return {!glift.displays.svg.SvgObj} this object.
   */
  emptyChildren: function() {
    this.children_ = [];
    return this;
  },

  /**
   * Empty out all the children and update.
   * @return {!glift.displays.svg.SvgObj} this object.
   */
  emptyChildrenAndUpdate: function() {
    this.emptyChildren();
    var elem = document.getElementById(this.attr('id'))
    while (elem && elem.firstChild) {
      elem.removeChild(elem.firstChild);
    }
    return this;
  },

  /**
   * Add an already existing child.
   * @param {!glift.displays.svg.SvgObj} obj Object to add.
   * @return {!glift.displays.svg.SvgObj} This object.
   */
  append: function(obj) {
    if (obj.attr('id') !== undefined) {
      this.idMap_[obj.attr('id')] = obj;
    }
    this.children_.push(obj);
    return this;
  },

  /**
   * Add a new svg object child.
   * @param {string} type
   * @param {Object} attrObj
   */
  appendNew: function(type, attrObj) {
    var obj = glift.displays.svg.createObj(type, attrObj);
    return this.append(obj);
  },

  /**
   * Append an SVG element and attach to the DOM.
   * @param {!glift.displays.svg.SvgObj} obj
   */
  appendAndAttach: function(obj) {
    this.append(obj);
    if (this.attr('id')) {
      obj.attachToParent(this.attr('id'))
    }
  },

  /**
   * Create a copy of the object without any children
   * @return {!glift.displays.svg.SvgObj}
   */
  copyNoChildren: function() {
    var newAttr = {};
    for (var key in this.attrMap_) {
      newAttr[key] = this.attrMap_[key];
    }
    return glift.displays.svg.createObj(this.type_, newAttr);
  }
};
