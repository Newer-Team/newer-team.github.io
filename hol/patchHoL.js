var currentRelease = "1.10";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("current-release").textContent = currentRelease;
});

var locStrings = {
	en: {
		UNKFILE: "Unknown file. Please ensure you selected a valid Ocarina of Time N64 ROM or Wii Virtual Console WAD.",
		PATCHING: "Patching...",
		PATCHROM: "Patch ROM"
	},
	fr: {
		UNKFILE: "Fichier inconnu. Assurez-vous d'avoir fourni une ROM N64 valide d'Ocarina of Time ou un fichier WAD de la Console Virtuelle Wii valide.",
		PATCHING: "Patch en cours...",
		PATCHROM: "Patcher une ROM"
	},
    ko: {
        UNKFILE: "알 수 없는 파일입니다. 올바른 시간의 오카리나 N64 롬 파일 또는 Wii 버추얼 콘솔 WAD 파일을 선택했는지 다시 확인해 주십시오.",
        PATCHING: "패치 중...",
        PATCHROM: "롬 파일 패치하기"
    }
};

function loc(id)
{
	return locStrings[lang][id];
}

var patches = {
    // adler32 checksums
    0xe9b6fb6c: "/hol/patches/CZLE_1.0.xdelta",
    0x588307fb: "/hol/patches/CZLE_1.1.xdelta",
    0xc0940244: "/hol/patches/CZLE_1.2.xdelta",
    0x7e8ffb71: "/hol/patches/CZLJ_1.0.xdelta",
    0xed4d0800: "/hol/patches/CZLJ_1.1.xdelta",
    0x556d0249: "/hol/patches/CZLJ_1.2.xdelta",
    0x14956656: "/hol/patches/NZLP_1.0.xdelta",
    0x472decc1: "/hol/patches/NZLP_1.1.xdelta",
    0xf8e2da97: "/hol/patches/NACE01.xdelta",
    0xcb78e464: "/hol/patches/NACP01.xdelta",
    0x6c906279: "/hol/patches/NACJ01.xdelta",
    0x5d0294bd: "/hol/patches/zlj_f_1.0.xdelta",
    0x200e5ab6: "/hol/patches/zlj_f_1.1.xdelta",
    0x4c02d72e: "/hol/patches/zle_f.xdelta",
    0xd34dff34: "/hol/patches/zlp_f.xdelta",
    0x338e4bef: "/hol/patches/urazlj_f.xdelta",
    0x6b5149bf: "/hol/patches/urazle_f.xdelta",
    0x1d6fd0bc: "/hol/patches/urazlp_f.xdelta"
};
var patchButton = document.getElementById("patch-button");

// adler32 function subject to MIT license at
// https://newerteam.com/js/webpatcher/LICENSE.md
// Copyright (c) 2024 shygoo
function adler32(arr, offs, size)
{
    var a = 1, b = 0;

    for(var i = 0; i < size; i++)
    {
        a = (a + arr[offs + i]) % 65521;
        b = (b + a) % 65521;
    }

    return ((b << 16) | a) >>> 0;
}

function calcChecksum(arrayBuffer)
{
    var arr = new Uint8Array(arrayBuffer);
    return adler32(arr, 0, arr.length);
}

// swapN64Rom function subject to MIT license at
// https://newerteam.com/js/webpatcher/LICENSE.md
// Copyright (c) 2024 shygoo
function swapN64Rom(sourceData)
{
    romdv = new DataView(sourceData);
    var word = romdv.getUint32(0x00000000);
    
    switch(word)
    {
    case 0x37804012:
        for(var i = 0; i < romdv.byteLength; i += 2)
        {
            romdv.setUint16(i, romdv.getUint16(i, true));
        }
        break;
    case 0x40123780:
        for(var i = 0; i < romdv.byteLength; i+= 4)
        {
            romdv.setUint32(i, romdv.getUint32(i, true));
        }
        break;
    case 0x80371240:
        // ROM already uses Z64 byte ordering
    }
    
    return romdv.buffer;
}

document.getElementById("patch-button").addEventListener("click", () => {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".z64,.n64,.v64,.wad";
    input.onchange = () => {
        var file = input.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = async () => {
            var sourceData = swapN64Rom(reader.result);
            var checksum = calcChecksum(sourceData);

            var patchPath = patches[checksum];
            if (!patchPath)
            {
                alert(loc("UNKFILE"));
                return;
            }
      
            patchButton.textContent = loc("PATCHING");
            patchButton.disabled = true;

            var patchRes = await fetch(patchPath);
            if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}: ${patchRes.statusText}`);
            var patchData = await patchRes.arrayBuffer();
   
            applyPatchAsync(sourceData, patchData, {
                onpatchend: (targetData) => {
                    var ext = file.name.split('.').pop();
                    if (ext == "n64" || ext == "v64") ext = "z64";
                    var outName = "HeroOfLaw." + ext;
                    saveAs(outName, targetData);
                    
                    patchButton.textContent = loc("PATCHROM");
                    patchButton.disabled = false;
                },
                
                onerror: (message) => alert("Error: " + message + "\n\n" + "See console output for more information."),
            });
        };

        reader.readAsArrayBuffer(file);
    };
    input.click();
});

// saveAs function subject to MIT license at
// https://newerteam.com/js/webpatcher/LICENSE.md
// Copyright (c) 2024 shygoo
function saveAs(filename, data)
{
    console.log('saving ' + filename + '...')

    var blob = new Blob([data], {type: 'octet/stream'});
    var url = window.URL.createObjectURL(blob);

    if(navigator && navigator.msSaveBlob)
    {
        console.log("using msSaveBlob...");
        navigator.msSaveBlob(blob, filename);
    }
    else
    {
        var a = document.createElement('a');
        a.style = "display: none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        try
        {
            a.click();
        }
        catch(e)
        {
            console.error(e);
            console.log('failed to save file');
        }
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}