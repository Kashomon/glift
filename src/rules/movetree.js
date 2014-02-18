/**
 * When an SGF is parsed by the parser, it is transformed into the following:
 *
 *MoveTree {
 * _currentNode
 * _rootNode
 *}
 *
 * And where a MoveNode looks like the following:
 * MoveNode: {
 *    nodeId: { ... },
 *    properties: Properties,
 *    children: [MoveNode, MoveNode, MoveNode],
 *    parent: MoveNode
 *  }
 *}
 *
 * Additionally, each node in the movetree has an ID property that looks like:
 *
 * node : {
 *  nodeId : <num>,  // The vertical position in the tree.
 *  varId  : <num>,  // The variation number, which is identical to the position
 *                   // in the 'nodes' array.  Also, the 'horizontal' position .
 * }
 *
 * If you are familiar with the SGF format, this should look very similar to the
 * actual SGF format, and is easily converted back to a SGF. And so, The
 * MoveTree is a simple wrapper around the parsed SGF.
 *
 * Each move is an object with two properties: tokens and nodes, the
 * latter of which is a list to capture the idea of multiple variations.
 */
glift.rules.movetree = {
  /** Create an empty MoveTree */
  getInstance: function(intersections) {
    var mt = new glift.rules._MoveTree(glift.rules.movenode());
    if (intersections !== undefined) {
      mt.setIntersections(intersections);
    }
    return mt;
  },

  /** Create a MoveTree from an SGF. */
  getFromSgf: function(sgfString, initPosition) {
    initPosition = initPosition || []; // treepath.
    if (sgfString === undefined || sgfString === "") {
      return glift.rules.movetree.getInstance(19);
    }
    // var mt = new MoveTree(glift.sgf.parser.parse($.trim(sgfString)));
    var mt = glift.sgf.parse(sgfString);
    for (var i = 0; i < initPosition.length; i++) {
      mt.moveDown(initPosition[i]);
    }
    return mt;
  },

  /**
   * Since a MoveTree is a tree of connected nodes, we can create a sub-tree
   * from any position in the tree.  This can be useful for recursion.
   */
  getFromNode: function(node) {
    return new glift.rules._MoveTree(node);
  },

  /** Seach nodes with a Depth First Search. */
  searchMoveTreeDFS: function(moveTree, func) {
    func(moveTree);
    for (var i = 0; i < moveTree.node().numChildren(); i++) {
      glift.rules.movetree.searchMoveTreeDFS(moveTree.moveDown(i), func);
    }
    moveTree.moveUp();
  }
};

/**
 * A MoveTree is a tree of movenodes played.  The movetree is (usually) a
 * processed parsed SGF, but could be created organically.
 *
 * Semantically, a MoveTree can be thought of as a game, but could also be a
 * problem, demonstration, or example.  Thus, this is the place where such moves
 * as currentPlayer or lastMove.
 */
glift.rules._MoveTree = function(rootNode, currentNode) {
  this._rootNode = rootNode;
  this._currentNode = currentNode || rootNode;
};

glift.rules._MoveTree.prototype = {
  /** Get a new move tree instance from the root node. */
  getTreeFromRoot: function() {
    return glift.rules.movetree.getFromNode(this._rootNode);
  },

  /**
   * Get a new tree reference.  The underlying tree remains the same, but this
   * is a lightway to create new references so the current node position can be
   * changed.
   */
  newTreeRef: function() {
    return new glift.rules._MoveTree(this._rootNode, this._currentNode);
  },

  /**
   * Get the current node -- that is, the node at the current position.
   */
  node: function() {
    return this._currentNode;
  },

  /**
   * Get the properties object on the current node.
   */
  properties: function() {
    return this.node().properties();
  },

  /**
   * Given a point and a color, find the variation number corresponding to the
   * branch that has the sepceified move.
   *
   * return either the number or null if no such number exists.
   */
  findNextMove: function(point, color) {
    var nextNodes = this.node().children,
        token = glift.sgf.colorToToken(color),
        ptSet = {};
    for (var i = 0; i < nextNodes.length; i++) {
      var node = nextNodes[i];
      if (node.properties().contains(token)) {
        if (node.properties().getOneValue(token) == "") {
          // This is a 'PASS'.  Ignore
        } else {
          ptSet[node.properties().getAsPoint(token).hash()] =
            node.getVarNum();
        }
      }
    }
    if (ptSet[point.hash()] !== undefined) {
      return ptSet[point.hash()];
    } else {
      return null;
    }
  },

  /**
   * Get the last move ([B] or [W]). This is a convenience method, since it
   * delegates to properties().getMove();
   *
   * Returns a simple object:
   *  {
   *    color:
   *    point:
   *  }
   *
   * returns null if property doesn't exist.  There are two cases
   * where this can occur:
   *  - The root node.
   *  - When, in the middle of the game, stone-placements are added for
   *  illustration (AW,AB).
   */
  getLastMove: function() {
    return this.properties().getMove();
  },

  /**
   * Get the next moves (i.e., nodes with either B or W properties);
   *
   * returns an array of dicts with the moves, e.g.,
   *
   *  [{
   *    color: <BLACK or WHITE>
   *    point: point
   *  },
   *  {...}]
   *
   *  The ordering of the moves is guranteed to be the ordering of the
   *  variations at the time of creation.
   */
  nextMoves: function() {
    var curNode = this.node();
    var nextMoves = [];
    for (var i = 0; i < curNode.numChildren(); i++) {
      var nextNode = curNode.getChild(i);
      var move = nextNode.properties().getMove();
      if (move) {
        nextMoves.push(move);
      }
    }
    return nextMoves;
  },

  /**
   * Get the current player.  This is exactly the opposite of the last move that
   * was played.  If we traverse all the way back to the beginning, the default
   * player is Black.
   */
  getCurrentPlayer: function() {
    var states = glift.enums.states;
    var curNode = this._currentNode;
    var move = curNode.properties().getMove();
    while (!move) {
      curNode = curNode.getParent();
      if (!curNode) { return states.BLACK; }
      move = curNode.properties().getMove();
    }
    if (!move) {
      return states.BLACK;
    } else if (move.color === states.BLACK) {
      return states.WHITE;
    } else if (move.color === states.WHITE) {
      return states.BLACK;
    } else {
      return states.BLACK;
    }
  },

  /**
   * Move down, but only if there is an available variation.  variationNum can
   * be undefined for convenicence, in which case it defaults to 0.
   */
  moveDown: function(variationNum) {
    var num = variationNum === undefined ? 0 : variationNum;
    if (this.node().getChild(num) !== undefined) {
      this._currentNode = this.node().getChild(num);
    }
    return this;
  },

  /**
   * Move up a move, but only if you are not in the intial (0th) move.
   */
  moveUp: function() {
    var parent = this._currentNode.getParent();
    if (parent) {
      this._currentNode = parent;
    }
    return this;
  },

  // Move to the root node
  moveToRoot: function() {
    this._currentNode = this._rootNode;
    return this;
  },

  /**
   * Add a newNode and move to that position.  This is convenient becuase it
   * means you can start adding properties.
   */
  addNode: function() {
    this.node().addChild();
    this.moveDown(this.node().numChildren() - 1);
    return this;
  },

  // TODO(kashomon): Finish this.
  deleteCurrentNode: function() {
    // var nodeId = glift.rules.movetree.getNodeId();
    // VarNum = this.getVarNum();
    // this.moveUp();
    // var theMoves = this.getAllNextNodes();
    //delete theMoves(nodeId,VarNum); // This is currently a syntax error
    throw "Unfinished";
  },

  recurse: function(func) {
    glift.rules.movetree.searchMoveTreeDFS(this, func);
  },

  recurseFromRoot: function(func) {
    glift.rules.movetree.searchMoveTreeDFS(this.getTreeFromRoot(), func);
  },

  toSgf: function() {
    return this._toSgfBuffer(this.getTreeFromRoot().node(), []).join("");
  },

  _toSgfBuffer: function(node, builder) {
    if (node.getParent()) {
      // Don't add a \n if we're at the root node
      builder.push("\n");
    }

    if (!node.getParent() || node.getParent().numChildren() > 1) {
      builder.push("(");
    }

    builder.push(";");
    for (var prop in node.properties().propMap) {
      var values = node.properties().getAllValues(prop);
      var out = prop;
      if (values.length > 0) {
        for (var i = 0; i < values.length; i++) {
          out += '[' + values[i] + ']'
        }
      } else {
        out += '[]';
      }
      builder.push(out);
    }

    for (var i = 0, len = node.numChildren(); i < len; i++) {
      this._toSgfBuffer(node.getChild(i), builder);
    }

    if (!node.getParent() || node.getParent().numChildren() > 1) {
      builder.push(")");
    }
    return builder
  },

  debugLog: function(spaces) {
    if (spaces === undefined) {
      spaces = "  ";
    }
    glift.util.logz(spaces + this.node(i).getVarNum() + '-'
        + this.node(i).getNodeNum());
    for (var i = 0; i < this.node().numChildren(); i++) {
      this.moveDown(i);
      this.debugLog(spaces);
      this.moveUp();
    }
  },

  //---------------------//
  // Convenience methods //
  //---------------------//
  setIntersections: function(intersections) {
    var mt = this.getTreeFromRoot(),
        allProperties = glift.sgf.allProperties;
    if (!mt.properties().contains(allProperties.SZ)) {
      this.properties().add(allProperties.SZ, intersections + "");
    }
    return this;
  },

  getIntersections: function() {
    var mt = this.getTreeFromRoot(),
        allProperties = glift.sgf.allProperties;
    if (mt.properties().contains(allProperties.SZ)) {
      var ints = parseInt(mt.properties().getAllValues(allProperties.SZ));
      return ints;
    } else {
      return undefined;
    }
  }
};
