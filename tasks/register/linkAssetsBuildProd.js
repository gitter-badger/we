module.exports = function (grunt) {
	grunt.registerTask('linkAssetsBuildProd', [
		'sails-linker:prodJsRelative',
		//'sails-linker:prodStylesRelative',
    'sails-linker:devStylesRelative',
		//'sails-linker:devTpl'
	]);
};
