
module.exports=function(config,membersMap,modulesMap){
	var preset=new Set(config.preset);
	if(preset.size==0){
		preset.add("ESNext");
	}
	if(preset.has("ESNext")){
		preset.add("ES2020");
		preset.add("ESNext.Array");
		preset.add("ESNext.Intl");
		preset.add("ESNext.Symbol");
		preset.add("ESNext.Promise");
	}
	if(preset.has("ES2020")){
		preset.add("ES2019");
		preset.add("ES2020.String");
		preset.add("ES2020.Symbol.WellKnown");
	}
	if(preset.has("ES2019")){
		preset.add("ES2018");
		preset.add("ES2019.Array");
		preset.add("ES2019.Object");
		preset.add("ES2019.String");
		preset.add("ES2019.Symbol");
	}
	if(preset.has("ES2018")){
		preset.add("ES2017");
		//preset.add("ES2018.Intl");
		preset.add("ES2018.Promise");
		//preset.add("ES2018.RegExp");
	}
	if(preset.has("ES2017")){
		preset.add("ES2016");
		preset.add("ES2017.Object");
		//preset.add("ES2017.Intl");
		//preset.add("ES2017.SharedMemory");
		preset.add("ES2017.String");
		preset.add("ES2017.TypedArrays");
	}
	if(preset.has("ES2016")){
		preset.add("ES2015");
		preset.add("ES2016.Array.Include");
	}
	if(preset.has("ES2015")){
		preset.add("ES2015.Core");
		preset.add("ES2015.Collection");
		//preset.add("ES2015.Generator");
		preset.add("ES2015.Iterable");
		preset.add("ES2015.Promise");
		//preset.add("ES2015.Proxy");
		preset.add("ES2015.Reflect");
		preset.add("ES2015.Symbol");
		preset.add("ES2015.Symbol.WellKnown");
	}
	if(preset.has("ES6")){
		preset.add("DOM");
		preset.add("DOM.Iterable");
	}
}