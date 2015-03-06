var api_url = "../api";

var nodes, edges, network;

function requestJSON(verb, url, data, callback) {
    return $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        'type': verb,
        'url': url,
        'data': JSON.stringify(data),
        'dataType': 'json',
        'success': callback
    });
};

$.postJSON = function(url, data, callback) {
    return requestJSON('POST', url, data, callback);
};

$.putJSON = function(url, data, callback) {
    return requestJSON('PUT', url, data, callback);
};

$.deleteHttp = function(url, callback) {
    return $.ajax({
        type: 'DELETE',
        url: url,
        success: callback
    });
};




// Canvas' (0,0) does not correspond with the network map's (0,0) position.
function toNetworkMapCoordinate(x, y) {
    var net =$("#network");
    var htmlElement = {
        topLeft: [net.offset().left, net.offset().top],
        width: net.width(),
        height: net.height()
    };

    var relativePercentPosition = [];
    relativePercentPosition[0] = (x - htmlElement.topLeft[0]) / htmlElement.width;
    relativePercentPosition[1] = (y - htmlElement.topLeft[1]) / htmlElement.height;

    // FIXME what if network does not exist yet?
    var canvas = {
        width: network.canvasBottomRight.x - network.canvasTopLeft.x,
        height: network.canvasBottomRight.y - network.canvasTopLeft.y
    };

    var ret = [];
    ret[0] = relativePercentPosition[0] * canvas.width + network.canvasTopLeft.x;
    ret[1] = relativePercentPosition[1] * canvas.height + network.canvasTopLeft.y;

    return ret;
}

function addDevicePositioned(type, elOffset, callback) {
    var x = elOffset.left;
    var y = elOffset.top;
    var position = toNetworkMapCoordinate(x, y);
    return addDevice({
        "group": type,
        "x": position[0],
        "y": position[1]
    }, callback);
}

function addDeviceWithName(label, type, x, y, callback) {
    return addDevice({
        "label": label,
        "group": type,
        "x": x,
        "y": y
    }, callback);
}

function addDevice(newDevice, callback) {
    $.postJSON( api_url + "/devices", newDevice,
        function(data) {
            console.log("The device was created successfully.");
        }).done(callback)
        .fail(function(data) { console.error("Something went wrong in the device creation.") });
}

function deleteDevice(deviceId) {
    $.deleteHttp(api_url + "/devices/" + deviceId,
        function(result) {
            console.log("The device has been deleted successfully.");
        }
    ).done(function(data) {redrawTopology();})
    .fail(function(data) { console.error("Something went wrong in the device removal.") });
}

function deleteEdge(edgeId) {
    $.getJSON( api_url + "/links/" + edgeId,
        function(data) {
            $.deleteHttp(data.endpoints[0] + "/link",
                function(result) {
                    console.log("The link has been deleted successfully.");
                }
            ).done(function(data) {redrawTopology();})
            .fail(function(data) { console.error("Something went wrong in the link removal.") });
        }
    ).fail(function(data) { console.error("Something went wrong getting this link " + edgeId + ".") });
}

function modifyDevice(deviceId, callback) {
    // General settings: PUT to /devices/id
    var modification = {
        label: $("form[name='modify-device'] input[name='displayName']").val()
    }
    $.putJSON(api_url + "/devices/" + deviceId, modification,
        function(result) {
            console.log("The device has been modified successfully.");
    }).done(callback)
    .fail(function(data) { console.error("Something went wrong in the device modification.") });
}

function modifyPort(deviceId, portName) {
    // Send new IP settings
    var modification = {
        portIpAddress: $("form[name='modify-device'] input[name='ipAddress']").val(),
        portSubnetMask: $("form[name='modify-device'] input[name='subnetMask']").val()
    }
    $.putJSON(api_url + "/devices/" + deviceId + "/ports/" + portName, modification,
        function(result) {
            console.log("The port has been modified successfully.");
    })
    .fail(function(data) { console.error("Something went wrong in the port modification.") });
}

function deleteLink(deviceId, portName, callback) {
    $.deleteHttp(api_url + "/devices/" + deviceId + "/ports/" + portName + "/link",
        function(result) {
            console.log("The link has been deleted successfully.");
        }
    ).done(callback)
    .fail(function(data) { console.error("Something went wrong in the link deletion.") });
}

function createLink(fromDeviceId, fromPortName, toDevice, toPort, callback) {
    var modification = {
        toDevice: toDevice,
        toPort: toPort
    }
    $.postJSON(api_url + "/devices/" + fromDeviceId + "/ports/" + fromPortName + "/link", modification,
        function(result) {
            console.log("The link has been created successfully.");
    }).done(callback)
    .fail(function(data) { console.error("Something went wrong in the link creation.") });
}

function createLinkIfNeeded(fromDeviceId, fromPortName, toDeviceId, toPortName, modForm, callback) {
    if (toDeviceId!="none") {
        var toDeviceName = $("#linkDevice option:selected", modForm).text();  // To get the name, not the id
        createLink(fromDeviceId, fromPortName, toDeviceName, toPortName, callback);
    } else callback();
}

function getAvailablePorts(deviceId, selectEl, csuccess, cfail) {
    $.getJSON(api_url + "/devices/" + deviceId + "/ports?free=true", function(ports) {
        csuccess(selectEl, ports);
    }).fail(cfail);
}

function loadAvailablePorts(toDeviceId, fromDeviceId, linkForm, bothLoadedSuccess, bothLoadedFail) {
    oneLoaded = false; // It must be global for the magic to happen ;)
    afterLoadingSuccess = function(selectPortsEl, ports) {
        // TODO Right now it returns a null, but it would be much logical to return an empty array.
        if (ports==null || ports.length==0) {
            bothLoadedFail("One of the devices you are trying to link has no available interfaces.");
        } else {
            loadPortsInSelect(ports, selectPortsEl, null);
            if (oneLoaded) { // Check race conditions!
                bothLoadedSuccess();
            } else {
                oneLoaded = true;
            }
        }
    }
    afterLoadingError = function(data) {
        console.error("Something went wrong getting this devices' available ports " + deviceId + ".")
        bothLoadedFail("Unable to get " + deviceId + " device's ports.");
    }

    getAvailablePorts(toDeviceId, $("#linkFromInterface", linkForm), afterLoadingSuccess, afterLoadingError);
    getAvailablePorts(fromDeviceId, $("#linkToInterface", linkForm), afterLoadingSuccess, afterLoadingError);
}

function onLinkCreation(toDeviceId, fromDeviceId) {
    $("#link-devices .loading").show();
    $("#link-devices .loaded").hide();
    $("#link-devices .error").hide();

    var linkForm = $("form[name='link-devices']");
    $("input[name='toDeviceId']", linkForm).val(toDeviceId);
    $("input[name='fromDeviceId']", linkForm).val(fromDeviceId);

    var dialog = $("#link-devices").dialog({
        title: "Connect two devices",
        autoOpen: false, height: 300, width: 400, modal: true, draggable: false,
        buttons: {
            "SUBMIT": function() {
                var callback = function() {
                    dialog.dialog( "close" );
                    redrawTopology();
                };
                // TODO get Port URL
                // TODO create link
            },
            Cancel:function() {
                $( this ).dialog( "close" );
            }
        }, close: function() { /*console.log("Closing dialog...");*/ }
     });
    var form = dialog.find( "form" ).on("submit", function( event ) { event.preventDefault(); });
    dialog.dialog( "open" );

    loadAvailablePorts(toDeviceId, fromDeviceId, linkForm,
        function() {
            $("#link-devices .loading").hide();
            $("#link-devices .loaded").show();
            $("#link-devices .error").hide();
        },
        function(errorMessage) {
            $(".error .error-msg", linkForm).text(errorMessage);
            // TODO find a less error-prone way to refer to the SUBMIT button (not its ordinal position!).
            $("button:first", dialog).attr('disabled','disabled');  // Disables the submit button
            $("#link-devices .loading").hide();
            $("#link-devices .loaded").hide();
            $("#link-devices .error").show();
        });
}

function handleModificationSubmit(callback) {
    // Check the tab
    var modForm = $("form[name='modify-device']");
    var selectedTab = $("li.ui-state-active", modForm).attr("aria-controls");
    var deviceId = $("input[name='deviceId']", modForm).val();
    if (selectedTab=="tabs-1") { // General settings
        modifyDevice(deviceId, callback);
    } else if (selectedTab=="tabs-2") { // Interfaces
        var selectedFromInterface = $("#interface", modForm).val().replace("/", "%20");
        // Room for improvement: the following request could be avoided when nothing has changed
        modifyPort(deviceId, selectedFromInterface);
        // The following requests can be done simultaneously
        // b. If link has changed
        var previousToDevice =$("input[name='linkPreviousDevice']", modForm).val();
        var previousToInterface =$("input[name='linkPreviousInterface']", modForm).val();
        var selectedToDevice = $("#linkDevice", modForm).val();
        var selectedToInterface = $("#linkInterface", modForm).val();
        if (previousToDevice!=selectedToDevice || (previousToDevice!="none" && previousToInterface!=selectedToInterface)) {
            if (previousToDevice!="none") {
                // b1. DELETE to /devices/id/ports/id/link
                deleteLink(deviceId, selectedFromInterface, function() {
                    createLinkIfNeeded(deviceId, selectedFromInterface, selectedToDevice, selectedToInterface, modForm, callback); // create after delete
                });
            } else {
                createLinkIfNeeded(deviceId, selectedFromInterface, selectedToDevice, selectedToInterface, modForm, callback); // create after delete
            }
        } else callback();  // In case just the port details are modified...
    } else {
        console.error("ERROR. Selected tab unknown.");
    }
}

function onDeviceAdd(x, y) {
    var dialog = $("#create-device").dialog({
        title: "Create new device",
        autoOpen: false, height: 300, width: 400, modal: true, draggable: false,
        buttons: {
            "SUBMIT": function() {
                var callback = function() {
                    dialog.dialog( "close" );
                    redrawTopology();
                };
                name = document.forms["create-device"]["name"].value;
                type = document.forms["create-device"]["type"].value;
                addDeviceWithName(name, type, x, y, callback);
            },
            Cancel:function() {
                $( this ).dialog( "close" );
            }
        }, close: function() { /*console.log("Closing dialog...");*/ }
     });
    dialog.parent().attr("id", "create-dialog");
    var form = dialog.find( "form" ).on("submit", function( event ) { event.preventDefault(); });
    $("#device-type").iconselectmenu().iconselectmenu("menuWidget").addClass("ui-menu-icons customicons");
    dialog.dialog( "open" );
}

function setPreviousLinkToNone(formToUpdate) {
    setPreviousLink(formToUpdate, "none", "none");
}

function setPreviousLink(formToUpdate, toDevice, toPort) {
    $("input[name='linkPreviousDevice']", formToUpdate).val(toDevice);
    $("input[name='linkPreviousInterface']", formToUpdate).val(toPort);
}

function selectLinkedDevice(device, port, formToUpdate, callback) {
    var selectInterfaceEl = $("#linkInterface", formToUpdate);
    if ('undefined' == typeof port.link) {
        selectInterfaceEl.hide();
        setPreviousLinkToNone(formToUpdate);
        callback(null);
    } else {
        // PRE: return more info in /link
        $.getJSON(api_url + "/devices/" + device.id + "/ports/" + port.portName.replace("/", "%20") + "/link", function(link) {
            setPreviousLink(formToUpdate, link.toDevice, link.toPort);
            $.getJSON(api_url + "/devices/" + link.toDevice + "/ports?byName=true", function(ports) {
                // populate select with iface names
                loadPortsInSelect(ports, selectInterfaceEl, null);
                // select iface
                selectOptionWithText(selectInterfaceEl, link.toPort);
                selectInterfaceEl.show();
                callback(link.toDevice);  // select device
            }).fail(function() {
                console.error("Ports for the device " + link.toDevice + " could not be loaded. Possible timeout.");
            });
        }).fail(function() {
            console.error("Port " + port.portName + " (device " + device + ") could not be loaded. Possible timeout.");
        });
    }
}

function selectOptionWithText(selectEl, text) {
    $("option", selectEl).filter(function () { return $(this).html() == text; }).prop('selected', true);
}

function updateConnectedDeviceSelect(device, port, formToUpdate, callback) {
    // Update the info of the link...
    var selectEl = $("#linkDevice", formToUpdate);
    selectEl.html('<option value="Loading..."></option>'); // Substitute all elements
    selectEl.prop('disabled', 'disabled');

    selectEl.append('<option value="none">None</option>');
    var node;
    for (var key in nodes._data) {
        node = nodes.get(key);
        if (node.id!=device.id) {
            selectEl.append('<option value="' + node.id + '">' + node.label + '</option>')
        }
    }
    var selectEl = $("#linkDevice", formToUpdate);
    selectLinkedDevice(device, port, formToUpdate, function(selectedLabel) {
        // Remove "Loading..." option
        $("option:selected", selectEl).each(function(index, element) {
            // There is only one: the temporary element added at the beginning
            element.remove();
        });
        if (selectedLabel==null) {
            $("input[name='linkId']", formToUpdate).val("");
            selectOptionWithText(selectEl, "None");

        } else {
            $("input[name='linkId']", formToUpdate).val(port.link);
            selectOptionWithText(selectEl, selectedLabel)
        }
        selectEl.prop('disabled', false);
        callback();
    });

    selectEl.change(function () {
        $("option:selected", this).each(function(index, element) { // There is only one selection
            var selectInterfaceEl = $("#linkInterface", formToUpdate);
            selectInterfaceEl.hide();
            var selectedDevice = $(element).val(); // or  $(element).text();
            if (selectedDevice!="none") {
                $.getJSON(api_url + "/devices/" + selectedDevice + "/ports", function(ports) {
                    loadPortsInSelect(ports, selectInterfaceEl, null); // populate select with device's ifaces
                    selectInterfaceEl.show();
                }).fail(function() {
                    console.error("Ports for the device " + selectedDevice + " could not be loaded. Possible timeout.");
                });
            }
        });
    });
}

function updateInterfaceInformation(device, port, formToUpdate, callback) {
    $("#loadedPanel>.loading").show();
    $("#loadedPanel>.loaded").hide();
    $('input[name="ipAddress"]', formToUpdate).val(port.portIpAddress);
    $('input[name="subnetMask"]', formToUpdate).val(port.portSubnetMask);
    updateConnectedDeviceSelect(device, port, formToUpdate, function() {
        $("#loadedPanel>.loading").hide();
        $("#loadedPanel>.loaded").show();
        callback();
    });
}

/**
 * @param defaultSelection It can be an int with the number of the option to be selected or a "null" (for any choice).
 * @return Selected port.
 */
function loadPortsInSelect(ports, selectElement, defaultSelection) {
    var ret = null;
    selectElement.html(""); // Remove everything
    for (var i = 0; i < ports.length; i++) {
        var portName = ports[i].portName;
        var htmlAppend = '<option value="' + portName + '"';
        if (i == defaultSelection) {
            htmlAppend += ' selected';
            ret = ports[i];
        }
        selectElement.append(htmlAppend + '>' + portName + '</option>');
    }
    return ret;
}

function setInterfaceInformationMode(loading) {
    if (loading) {

    } else {

    }
}

function loadPortsForInterface(ports, selectedDevice, formToUpdate) {
    var selectedPort = loadPortsInSelect(ports, $("#interface", formToUpdate), 0);
    if (selectedPort!=null) {
        updateInterfaceInformation(selectedDevice, selectedPort, formToUpdate, function () {
            $("#tabs-2>.loading").hide();
            $("#tabs-2>.loaded").show();
        });
    }
    $("#interface", formToUpdate).change(function () {
        $("option:selected", this).each(function(index, element) { // There is only one selection
            var selectedIFace = $(element).text();
            for (var i = 0; i < ports.length; i++) {  // Instead of getting its info again (we save one request)
                if ( selectedIFace == ports[i].portName ) {
                    setInterfaceInformationMode(true);
                    updateInterfaceInformation(selectedDevice, ports[i], formToUpdate, function() {
                        setInterfaceInformationMode(false);
                    });
                    break;
                }
            }
        });
    });
}

function updateEditForm(node) {
    $("#tabs-2>.loading").show();
    $("#tabs-2>.loaded").hide();

    var current = nodes.get(node);
    var modForm = $("form[name='modify-device']");
    $("input[name='deviceId']", modForm).val(node);
    $("input[name='displayName']", modForm).val(current.label);

    $.getJSON(api_url + "/devices/" + node + "/ports", function(data) {
        loadPortsForInterface(data, current, modForm);
    }).fail(function() {
        console.error("Ports for the device " + node + " could not be loaded. Possible timeout.");
    });
}

function onDeviceEdit(node) {
    updateEditForm(node);
    var callback = function() {
        dialog.dialog( "close" );
        redrawTopology();
    };
    $("#modify-dialog-tabs").tabs();
    var dialog = $("#modify-device").dialog({
        title: "Modify device",
        autoOpen: false, height: 350, width: 450, modal: true, draggable: false,
        buttons: {
            "SUBMIT": function() {
                handleModificationSubmit(callback);
            },
            Cancel:function() {
                $( this ).dialog( "close" );
            }
        }, close: function() { /*console.log("Closing dialog...");*/ }
     });
    dialog.parent().attr("id", "modify-dialog");
    var form = dialog.find( "form" ).on("submit", function( event ) { event.preventDefault(); });
    dialog.dialog( "open" );
}

function loadTopology(responseData) {
    nodesJson = responseData.devices;
    edgesJson = responseData.edges;

    // create an array with nodes
    nodes = new vis.DataSet();
    nodes.subscribe('*', function() {
        $('#nodes').html(toJSON(nodes.get()));
    });
    if (nodesJson != null) {
        nodes.add(nodesJson);
    }

    // create an array with edges
    edges = new vis.DataSet();
    edges.subscribe('*', function() {
        $('#edges').html(toJSON(edges.get()));
    });
    if (edgesJson != null) {
        edges.add(edgesJson);
    }

    // create a network
    var container = $('#network').get(0);
    var visData = { nodes : nodes, edges : edges };
    var options = {
        //dragNetwork : false,
        //dragNodes : true,
        //zoomable : false,
        stabilize: true,
        dataManipulation: true,
        edges: {
            width: 3,
            widthSelectionMultiplier: 1.4,
            color: {
                color:'#606060',
                highlight:'#000000',
                hover: '#000000'
            }
         },
        groups : {
            cloudDevice : {
                shape : 'image',
                image : "cloud.png"
            },
            routerDevice : {
                shape : 'image',
                image : "router.png"
            },
            switchDevice : {
                shape : 'image',
                image : "switch.png"
            },
            pcDevice : {
                shape : 'image',
                image : "PC.png"
            }
        },
        onAdd: function(data,callback) {
            onDeviceAdd(data.x, data.y);
        },
        onConnect: function(data,callback) {
            onLinkCreation(data.from, data.to)
        },
        onEdit: function(data,callback) {
            onDeviceEdit(data.id);
        },
        onDelete: function(data,callback) {
            if (data.nodes.length>0) {
                deleteDevice(data.nodes[0])
            } else if (data.edges.length>0) {
                deleteEdge(data.edges[0]);
            }
        }
    };
    network = new vis.Network(container, visData, options);
}

// convenience method to stringify a JSON object
function toJSON(obj) {
    return JSON.stringify(obj, null, 4);
}

function redrawTopology() {
    redrawTopology(null);
}

/**
 * @arg callback If it is null, it is simply ignored.
 */
function redrawTopology(callback) {
    $.getJSON(api_url + "/network", function(data) {
        loadTopology(data);
        if (callback!=null)
            callback();
    }).fail(function() {
        console.error("The topology could not be loaded. Possible timeout.");
    });  // Apparently status code 304 is an error for this method :-S
}

// From: http://www.jquerybyexample.net/2012/06/get-url-parameters-using-jquery.html
function getURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}

// Source: http://stackoverflow.com/questions/5419134/how-to-detect-if-two-divs-touch-with-jquery
function collisionWithCanvas(element) {
    var x1 = $("#network").offset().left;
    var y1 = $("#network").offset().top;
    var h1 = $("#network").outerHeight(true);
    var w1 = $("#network").outerWidth(true);
    var b1 = y1 + h1;
    var r1 = x1 + w1;
    var x2 = element.offset().left;
    var y2 = element.offset().top;
    var h2 = element.outerHeight(true);
    var w2 = element.outerWidth(true);
    var b2 = y2 + h2;
    var r2 = x2 + w2;

    if (b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2) return false;
    return true;
}

function initDraggable(element) {
    element.animate({'opacity':'1'}, 1000, function() {
        element.css({ // would be great with an animation too, but it doesn't work
            'left':element.data('originalLeft'),
            'top':element.data('originalTop')
        });
    });
}

function configureDraggableCreationElement(element, creation_function) {
    element.data({ // Or we could also record it in the 'start' event.
        'originalLeft': element.css('left'),
        'originalTop': element.css('top')
    });
    element.draggable({
        helper: "clone",
        opacity: 0.4,
        /*revert: true, // It interferes with the position I want to capture in the 'stop' event
        revertDuration: 2000,*/
        start: function(event, ui) {
            $(this).css({'opacity':'0.7'});
        },
        /*drag: function(event, ui ) {
            console.log(event);
        },*/
        stop: function(event, ui) {
            if (collisionWithCanvas(ui.helper)) {
                var image = $('<img alt="Temporary image" src="' + ui.helper.attr("src") + '">');
                image.css("width", ui.helper.css("width"));
                var warning = $('<div class="text-in-image"><span>Creating...</span></div>');
                warning.prepend(image);
                $("body").append(warning);
                warning.css({'position': 'absolute',
                             'left': ui.offset.left,
                             'top': ui.offset.top});
                creation_function(ui.offset, function() {
                    redrawTopology(function() {
                        initDraggable(element);
                        warning.remove();
                    });
                });
            } else {
                initDraggable(element);
            }
        }
    });
}

$(function() {
    var debugMode = getURLParameter('debug');
    if (debugMode!=null) {
        $.getScript("debug.js", function() {
            console.log("DEBUG MODE ON.");
        });
    }
    if (location.port==8000) {
        // If the page is deployed in the port 8000, it assumes that the python simple server is running
        // and the API is working in a different server.
        api_url = "http://localhost:8080/webPacketTracer/api";
        console.log("Using an API deployed in a different HTTP server: " + api_url)
    }

    $.widget( "custom.iconselectmenu", $.ui.selectmenu, {
        _renderItem: function( ul, item ) {
            var li = $( "<li>", { text: item.label } );
            if ( item.disabled ) {
                li.addClass( "ui-state-disabled" );
            }
            $( "<span>", {
                style: item.element.attr( "data-style" ),
                "class": "ui-icon " + item.element.attr( "data-class" )
             }).appendTo( li );
             return li.appendTo( ul );
        }
    });
    $("#create-device").hide();
    $("#modify-device").hide();

    configureDraggableCreationElement($("#cloud"), function(elementOffset, callback) {
        addDevicePositioned("cloud", elementOffset, callback);
    });
    configureDraggableCreationElement($("#router"), function(elementOffset, callback) {
        addDevicePositioned("router", elementOffset, callback);
    });
    configureDraggableCreationElement($("#switch"), function(elementOffset, callback) {
        addDevicePositioned("switch", elementOffset, callback);
    });
    configureDraggableCreationElement($("#pc"), function(elementOffset, callback) {
        addDevicePositioned("pc",elementOffset, callback);
    });

    redrawTopology(null);
});