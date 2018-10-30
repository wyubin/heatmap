/*!
 * Figue from https://github.com/nantunes/figue/blob/master/figue.js
 * compact into nodejs module
 * only keep cluster function, not generateDendogram
 */
/**
* create a tool for cluster
* @constructor
* @version 0.0.1
*/
module.id='fique';
var figue = function(){};
module.exports = figue;
// property assign
figue.SINGLE_LINKAGE= 0;
figue.COMPLETE_LINKAGE= 1;
figue.AVERAGE_LINKAGE=2;
figue.EUCLIDIAN_DISTANCE= 0;
figue.MANHATTAN_DISTANCE= 1;
figue.MAX_DISTANCE= 2;
figue.PRINT_VECTOR_VALUE_PRECISION= 2;
figue.KMEANS_MAX_ITERATIONS= 10;
figue.FCMEANS_MAX_ITERATIONS= 3;
// tree type distance
figue.euclidianDistance = function(vec1 , vec2){
	var N = vec1.length ;
	var d = 0 ;
	for (var i = 0 ; i < N ; i++)
		d += Math.pow (vec1[i] - vec2[i], 2)
	d = Math.sqrt (d) ;
	return d ;
}
figue.manhattanDistance = function(vec1 , vec2){
	var N = vec1.length ;
	var d = 0 ;
	for (var i = 0 ; i < N ; i++)
		d += Math.abs (vec1[i] - vec2[i])
	return d ;
}
figue.maxDistance = function(vec1 , vec2){
	var N = vec1.length ;
	var d = 0 ;
	for (var i = 0 ; i < N ; i++)
		d = Math.max (d , Math.abs (vec1[i] - vec2[i])) ;
	return d ;
}
// vector functions
figue.addVectors = function(vec1 , vec2){
	var N = vec1.length ;
	var vec = new Array(N) ;
	for (var i = 0 ; i < N ; i++)
		vec[i] = vec1[i] + vec2[i] ;
	return vec ;
}
figue.multiplyVectorByValue = function(value , vec2){
	var N = vec.length ;
	var v = new Array(N) ;
	for (var i = 0 ; i < N ; i++)
		v[i] = value * vec[i] ;
	return v ;
}
figue.vectorDotProduct = function(vec1 , vec2){
	var N = vec1.length ;
	var s = 0 ;
	for (var i = 0 ; i < N ; i++)
		s += vec1[i] * vec2[i] ;
	return s ;
}
// string function
figue.calculateCentroid = function(c1Size , c1Centroid , c2Size , c2Centroid){
	var newCentroid = new Array(c1Centroid.length) ;
	var newSize = c1Size + c2Size ;
	for (var i = 0 ; i < c1Centroid.length ; i++)
		newCentroid[i] = (c1Size * c1Centroid[i] + c2Size * c2Centroid[i]) / newSize ;
	return newCentroid ;
}
// count distance
figue.agglomerate = function(labels, vectors, distance, linkage){
	var N = vectors.length ;
	var dMin = new Array(N) ;
	var cSize = new Array(N) ;
	var matrixObj = new this.Matrix(N,N);
	var distMatrix = matrixObj.mtx ;
	var clusters = new Array(N) ;

	var c1, c2, c1Cluster, c2Cluster, i, j, p, root , newCentroid ;

	if (distance == this.EUCLIDIAN_DISTANCE)
		distance = this.euclidianDistance ;
	else if (distance == this.MANHATTAN_DISTANCE)
		distance = this.manhattanDistance ;
	else if (distance == this.MAX_DISTANCE)
		distance = this.maxDistance ;

	// Initialize distance matrix and vector of closest clusters
	for (i = 0 ; i < N ; i++) {
		dMin[i] = 0 ;
		for (j = 0 ; j < N ; j++) {
			if (i == j)
				distMatrix[i][j] = Infinity ;
			else
				distMatrix[i][j] = distance(vectors[i] , vectors[j]) ;

			if (distMatrix[i][dMin[i]] > distMatrix[i][j] )
				dMin[i] = j ;
		}
	}

	// create leaves of the tree
	for (i = 0 ; i < N ; i++) {
		clusters[i] = [] ;
		clusters[i][0] = new this.Node(labels[i], null, null, 0, vectors[i]) ;
		cSize[i] = 1 ;
	}

	// Main loop
	for (p = 0 ; p < N-1 ; p++) {
		// find the closest pair of clusters
		c1 = 0 ;
		for (i = 0 ; i < N ; i++) {
			if (distMatrix[i][dMin[i]] < distMatrix[c1][dMin[c1]])
				c1 = i ;
		}
		c2 = dMin[c1] ;

		// create node to store cluster info
		c1Cluster = clusters[c1][0] ;
		c2Cluster = clusters[c2][0] ;

		newCentroid = this.calculateCentroid( c1Cluster.size , c1Cluster.centroid , c2Cluster.size , c2Cluster.centroid ) ;
		newCluster = new this.Node(-1, c1Cluster, c2Cluster , distMatrix[c1][c2] , newCentroid) ;
		clusters[c1].splice(0,0, newCluster) ;
		cSize[c1] += cSize[c2] ;

		//Â overwriteÂ rowÂ c1Â with respect to the linkage type
		for (j = 0 ; j < N ; j++) {
			if (linkage == this.SINGLE_LINKAGE) {
				if (distMatrix[c1][j] > distMatrix[c2][j])
					distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
			} else if (linkage == this.COMPLETE_LINKAGE) {
				if (distMatrix[c1][j] < distMatrix[c2][j])
					distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
			} else if (linkage == this.AVERAGE_LINKAGE) {
				var avg = ( cSize[c1] * distMatrix[c1][j] + cSize[c2] * distMatrix[c2][j])  / (cSize[c1] + cSize[j])
				distMatrix[j][c1] = distMatrix[c1][j] = avg ;
			}
		}
		distMatrix[c1][c1] = Infinity ;

		//Â infinity Â­outÂ oldÂ rowÂ c2Â andÂ columnÂ c2
		for (i = 0 ; i < N ; i++)
			distMatrix[i][c2] = distMatrix[c2][i] = Infinity ;

		//Â updateÂ dminÂ andÂ replaceÂ onesÂ thatÂ previousÂ pointedÂ to c2 to point to c1
		for (j = 0; j < N ; j++) {
			if (dMin[j] == c2)
				dMin[j] = c1;
			if (distMatrix[c1][j] < distMatrix[c1][dMin[c1]])
				dMin[c1] = j;
		}

		// keep track of the last added cluster
		root = newCluster ;
	}

	return root ;
}
figue.getRandomVectors = function(k, vectors){
	/*  Returns a array of k distinct vectors randomly selected from a the input array of vectors
		Returns null if k > n or if there are less than k distinct objects in vectors */

	var n = vectors.length ;
	if ( k > n )
		return null ;

	var selected_vectors = new Array(k) ;
	var selected_indices = new Array(k) ;

	var tested_indices = new Object ;
	var tested = 0 ;
	var selected = 0 ;
	var i , vector, select ;
	while (selected < k) {
		if (tested == n)
			return null ;

		var random_index = Math.floor(Math.random()*(n)) ;
		if (random_index in tested_indices)
			continue ;

		tested_indices[random_index] = 1;
		tested++ ;
		vector = vectors[random_index] ;
		select = true ;
		for (i = 0 ; i < selected ; i++) {
			if ( vector.compare(selected_vectors[i]) ) {
				select = false ;
				break ;
			}
		}
		if (select) {
			selected_vectors[selected] = vector ;
			selected_indices[selected] = random_index ;
			selected++ ;
		}
	}
	return {'vectors': selected_vectors, 'indices': selected_indices} ;
}
figue.kmeans = function(k, vectors){
	var n = vectors.length ;
	var assignments = new Array(n) ;
	var clusterSizes = new Array(k) ;
	var repeat = true ;
	var nb_iters = 0 ;
	var centroids = null ;

	var t = this.getRandomVectors(k, vectors) ;
	if (t == null)
		return null ;
	else
		centroids = t.vectors ;

	while (repeat) {

		// assignment step
		for (var j = 0 ; j < k ; j++)
			clusterSizes[j] = 0 ;

		for (var i = 0 ; i < n ; i++) {
			var vector = vectors[i] ;
			var mindist = Number.MAX_VALUE ;
			var best ;
			for (var j = 0 ; j < k ; j++) {
				dist = this.euclidianDistance(centroids[j], vector)
				if (dist < mindist) {
					mindist = dist ;
					best = j ;
				}
			}
			clusterSizes[best]++ ;
			assignments[i] = best ;
		}

		// update centroids step
		var newCentroids = new Array(k) ;
		for (var j = 0 ; j < k ; j++)
			newCentroids[j] = null ;

		for (var i = 0 ; i < n ; i++) {
			cluster = assignments[i] ;
			if (newCentroids[cluster] == null)
				newCentroids[cluster] = vectors[i] ;
			else
				newCentroids[cluster] = this.addVectors(newCentroids[cluster] , vectors[i]) ;
		}

		for (var j = 0 ; j < k ; j++) {
			newCentroids[j] = this.multiplyVectorByValue(1/clusterSizes[j] , newCentroids[j]) ;
		}

		// check convergence
		repeat = false ;
		for (var j = 0 ; j < k ; j++) {
			if (! newCentroids[j].compare(centroids[j])) {
				repeat = true ;
				break ;
			}
		}
		centroids = newCentroids ;
		nb_iters++ ;

		// check nb of iters
		if (nb_iters > this.KMEANS_MAX_ITERATIONS)
			repeat = false ;

	}
	return { 'centroids': centroids , 'assignments': assignments} ;
}
figue.fcmeans = function(k, vectors, epsilon, fuzziness){
	var membershipMatrix = new this.Matrix(vectors.length, k) ;
	var repeat = true ;
	var nb_iters = 0 ;

	var centroids = null ;

	var i,j,l, tmp, norm, max, diff ;
	while (repeat) {
		// initialize or update centroids
		if (centroids == null) {

			tmp = this.getRandomVectors(k, vectors) ;
			if (tmp == null)
				return null ;
			else
				centroids = tmp.vectors ;

		} else {
			for (j = 0 ; j < k; j++) {
				centroids[j] = [] ;
				norm = 0 ;
				for (i = 0 ; i < membershipMatrix.rows ; i++) {
					norm += Math.pow(membershipMatrix.mtx[i][j], fuzziness) ;
					tmp = this.multiplyVectorByValue( Math.pow(membershipMatrix.mtx[i][j], fuzziness) , vectors[i]) ;

					if (i == 0)
						centroids[j] = tmp ;
					else
						centroids[j] = this.addVectors(centroids[j] , tmp) ;
				}
				if (norm > 0)
					centroids[j] = this.multiplyVectorByValue(1/norm, centroids[j]);


			}

		}
		//alert(centroids);

		// update the degree of membership of each vector
		previousMembershipMatrix = membershipMatrix.copy() ;
		for (i = 0 ; i < membershipMatrix.rows ; i++) {
			for (j = 0 ; j < k ; j++) {
				membershipMatrix.mtx[i][j] = 0;
				for (l = 0 ; l < k ; l++) {
					if (this.euclidianDistance(vectors[i] , centroids[l]) == 0)
						tmp = 0 ;
					else
						tmp =  this.euclidianDistance(vectors[i] , centroids[j]) / this.euclidianDistance(vectors[i] , centroids[l]) ;
					tmp = Math.pow (tmp, 2/(fuzziness-1)) ;
					membershipMatrix.mtx[i][j] += tmp ;
				}
				if (membershipMatrix.mtx[i][j] > 0)
					membershipMatrix.mtx[i][j] = 1 / membershipMatrix.mtx[i][j] ;
			}
		}

		//alert(membershipMatrix) ;

		// check convergence
		max = -1 ;
		diff;
		for (i = 0 ; i < membershipMatrix.rows ; i++)
			for (j = 0 ; j < membershipMatrix.cols ; j++) {
				diff = Math.abs(membershipMatrix.mtx[i][j] - previousMembershipMatrix.mtx[i][j]) ;
				if (diff > max)
					max = diff ;
			}

		if (max < epsilon)
			repeat = false ;

		nb_iters++ ;

		// check nb of iters
		if (nb_iters > this.FCMEANS_MAX_ITERATIONS)
			repeat = false ;
	}
	return { 'centroids': centroids , 'membershipMatrix': membershipMatrix} ;
}
// base object
figue.Matrix = function(rows,cols){
	this.rows = rows ;
	this.cols = cols ;
	this.mtx = new Array(rows) ;

	for (var i = 0 ; i < rows ; i++)
	{
		var row = new Array(cols) ;
		for (var j = 0 ; j < cols ; j++)
			row[j] = 0;
		this.mtx[i] = row ;
	}
}
figue.Node = function(label,left,right,dist, centroid){
	this.label = label ;
	this.left = left ;
	this.right = right ;
	this.dist = dist ;
	this.centroid = centroid ;
	if (left == null && right == null) {
		this.size = 1 ;
		this.depth = 0 ;
	} else {
		this.size = left.size + right.size ;
		this.depth = 1 + Math.max (left.depth , right.depth ) ;
	}
}
// matrix method
figue.Matrix.prototype.toString = function(){
	var lines = [] ;
	for (var i = 0 ; i < this.rows ; i++)
		lines.push (this.mtx[i].join("\t")) ;
	return lines.join ("\n");
}
figue.Matrix.prototype.copy = function(){
	var duplicate = new figue.Matrix(this.rows, this.cols) ;
	for (var i = 0 ; i < this.rows ; i++)
		duplicate.mtx[i] = this.mtx[i].slice(0);
	return duplicate ;
}
// Node method
figue.Node.prototype.isLeaf = function(){
	if ((this.left == null) && (this.right == null))
		return true ;
	else
		return false ;
}
Array.prototype.compare = function(testArr) {
	if (this.length != testArr.length) return false;
	for (var i = 0; i < testArr.length; i++) {
		if (this[i].compare) {
			if (!this[i].compare(testArr[i])) return false;
		}
		if (this[i] !== testArr[i]) return false;
	}
	return true;
}
