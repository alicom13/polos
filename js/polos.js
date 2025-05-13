/*!
 * Polos v0.0.1 (https://wsw.biz.id/)
 * Copyright 2025 Polos Style
 * Unlicensed
 */
/*!
 * Polos Jquery
 */
$(document).ready(function(){
    // colsole.log( "Polos Style" );
    if( window.matchMedia('(max-width: 575.98px)').matches){
        // Fungsi Layar Sempit
        $( "div.rw.m-2.p-3" ).removeClass( "m-2 p-3" );
        // ganti css
        $( "div.lmn.shadow-sm.m-2.p-3" ).removeClass( "m-2 p-3" ).addClass( "m-1 p-1" );
        // atribut baru
        // $("div.lmn.shadow-sm.m-2.p-3").css({"padding": "0 !important", "font-size": "90%","border":"1px solid gold"});
    } else {
        // Fungsi Layar Lebar
    }
});
