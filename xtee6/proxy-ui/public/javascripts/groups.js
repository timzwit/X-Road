var oGroups, oGroupMembers, oMembersSearch;

$.fn.dataTableExt.afnFiltering.push(
    function(oSettings, aData, iDataIndex) {
        if (oSettings.sTableId == "members_search") {
            var show_existing_members =
                $("#members_search_actions .show_existing:checked").length > 0;

            var row = oSettings.aoData[iDataIndex].nTr;

            return show_existing_members || !$(row).hasClass("unselectable");
        }
        return true;
    }
);

function enableGroupsActions() {
    if (oGroups.getFocus()) {
        $("#group_details").enable();
    } else {
        $("#group_details").disable();
    }
}

function enableGroupMembersActions() {
    if (oGroupMembers.getFocus()) {
        $("#group_members_remove_selected").enable();
    } else {
        $("#group_members_remove_selected").disable();
    }
}

function enableMembersAddActions() {
    if (oMembersSearch.getFocus()) {
        $("#group_members_add_selected").enable();
    } else {
        $("#group_members_add_selected").disable();
    }
}

function refreshGroups() {
    var params = {
        client_id: $("#details_client_id").val()
    };

    $.get(action("client_groups"), params, function(response) {
        var selected_group = oGroups.getFocusData();

        oGroups.fnClearTable();
        oGroups.fnAddData(response.data);

        if (selected_group) {
            $.each(oGroups.fnGetNodes(), function(idx, val) {
                if (oGroups.fnGetData(val).code == selected_group.code) {
                    oGroups.setFocus(0, val);
                    return false;
                }
            });
        }

        enableGroupsActions();

        oGroups.fnAdjustColumnSizing();
    });
}

function initClientGroupsDialog() {
    $("#client_groups_dialog").initDialog({
        autoOpen: false,
        modal: true,
        height: 450,
        width: 700,
        buttons: [
            { text: "Close",
              click: function() {
                  $(this).dialog("close");
              }
            }
        ]
    });

    $("#client_groups").click(function() {
        var subsystem = $('#details_subsystem_code').val() !== ''
            ? ' subsystem ' + $('#details_subsystem_code').val() : '';
        var title = $('#details_member_name').val() + subsystem + ' : Local Groups';

        oGroups.fnClearTable();

        refreshGroups();

        $("#client_groups_dialog").dialog("option", "title", title);
        $("#client_groups_dialog").dialog("open");
    });
}

function initGroupAddDialog() {
    $("#group_add_dialog").initDialog({
        autoOpen: false,
        modal: true,
        height: 250,
        width: 300,
        buttons: [
            { text: _("ok"),
              click: function() {
                  var dialog = this;
                  var params = $("form", this).serializeObject();
                  params.client_id = $("#details_client_id").val();

                  $.post(action("group_add"), params, function(response) {
                      oGroups.fnClearTable();
                      oGroups.fnAddData(response.data);
                      enableGroupsActions();

                      $(dialog).dialog("close");
                  }, "json");
              }
            },
            { text: _("cancel"),
              click: function() {
                  $(this).dialog("close");
              }
            }
        ]
    });

    $("#group_add").click(function() {
        $("#add_group_code, #add_group_description").val("");
        $("#group_add_dialog").dialog("open");
    });
}

function initGroupDetailsDialog() {
    $("#group_details_dialog").initDialog({
        autoOpen: false,
        modal: true,
        height: 700,
        width: "95%",
        buttons: [
            { text: _("close"),
              click: function() {
                  refreshGroups();
                  $(this).dialog("close");
              }
            }
        ]
    });

    $("#group_details").click(function() {
        var group = oGroups.getFocusData();
        var title = "Local Group " + group.code;

        var params = {
            client_id: $("#details_client_id").val(),
            group_code: group.code
        };

        $.get(action("group_members"), params, function(response) {
            oGroupMembers.fnClearTable();
            oGroupMembers.fnAddData(response.data);
            enableGroupMembersActions();

            $("#group_details_description").val(group.description);
            $("#group_description_edit").val(group.description);

            $("#group_details_member_count").html(
                oGroupMembers.fnSettings().fnRecordsTotal());

            $("#group_details_dialog").dialog("option", "title", title);
            $("#group_details_dialog").dialog("open");

            oGroupMembers.fnAdjustColumnSizing();
        });
    });

    $("#group_delete").click(function() {
        var group = oGroups.getFocusData();
        var params = {
            client_id: $("#details_client_id").val(),
            group_code: group.code
        };

        confirm("clients.groups.delete.confirm", [group.code], function() {
            $.post(action("group_delete"), params, function(response) {
                oGroups.fnClearTable();
                oGroups.fnAddData(response.data);
                enableGroupsActions();

                $("#group_details_dialog").dialog("close");
            }, "json");
        });
    });

    $("#group_members_remove_selected").click(function() {
        var group = oGroups.getFocusData();
        var params = {
            client_id: $("#details_client_id").val(),
            group_code: group.code,
            member_ids: []
        };

        $.each(oGroupMembers.fnGetNodes(), function(idx, val) {
            if ($(val).hasClass("row_selected")) {
                var member = oGroupMembers.fnGetData(val);
                params.member_ids.push(member.member_id);
            }
        });

        $.post(action("group_members_remove"), params, function(response) {
            oGroupMembers.fnClearTable();
            oGroupMembers.fnAddData(response.data);
            enableGroupMembersActions();

            $("#group_details_member_count").html(
                oGroupMembers.fnSettings().fnRecordsTotal());
        });
    });
}

function initGroupDescriptionEditDialog() {
    $("#group_description_edit_dialog").initDialog({
        autoOpen: false,
        modal: true,
        height: 300,
        width: 300,
        buttons: [
            { text: _("ok"),
              click: function() {
                  var dialog = this;
                  var groupCode = oGroups.getFocusData().code;
                  var description = $("#group_description_edit").val();

                  var params = {
                      client_id: $("#details_client_id").val(),
                      group_code: groupCode,
                      description: description
                  };

                  $.post(action("group_description_edit"), params, function(response) {
                      $("#group_details_description").val(description);
                      $(dialog).dialog("close");
                  }, "json");
              }
            },
            { text: _("cancel"),
              click: function() {
                  $(this).dialog("close");
              }
            }
        ]
    });

    $("#group_details_dialog #edit").click(function() {
        $("#group_description_edit_dialog").dialog("open");
    });
}

function initGroupMembersAddDialog() {
    var dialog = $("#group_members_add_dialog").initDialog({
        autoOpen: false,
        modal: true,
        height: 700,
        width: "95%",
        buttons: [
            { text: "Add Selected to Group",
              id: "group_members_add_selected",
              click: function() {
                  var dialog = this;
                  var group = oGroups.getFocusData();
                  var params = {
                      client_id: $("#details_client_id").val(),
                      group_code: group.code,
                      member_ids: []
                  };

                  $.each(oMembersSearch.fnGetNodes(), function(idx, val) {
                      if ($(val).hasClass("row_selected")) {
                          var member = oMembersSearch.fnGetData(val);
                          params.member_ids.push(member.subject_id);
                      }
                  });

                  $.post(action("group_members_add"), params, function(response) {
                      oGroupMembers.fnClearTable();
                      oGroupMembers.fnAddData(response.data);
                      enableGroupMembersActions();

                      $("#group_details_member_count").html(
                          oGroupMembers.fnSettings().fnRecordsTotal());

                      $(dialog).dialog("close");
                  });
              }
            },
            { text: _("cancel"),
              click: function() {
                  $(this).dialog("close");
              }
            }
        ]
    });

    $("#group_members_add").click(function() {
        var group = oGroups.getFocusData();
        var title = "Add Members to Local Group " + group.code;

        $("#group_members_add_dialog").dialog("option", "title", title);
        $("#group_members_add_dialog").dialog("open");

        oMembersSearch.fnClearTable();
        enableMembersAddActions();
    });

    $(".advanced_search_form .search", dialog).click(function() {
        var params = $(".advanced_search_form", dialog).serializeObject();
        params.members_only = true;

        $.get(action("subjects_search"), params, function(response) {
            oMembersSearch.fnClearTable();
            oMembersSearch.fnAddData(response.data);

            // let's draw again so we can filter based on added classes
            oMembersSearch.fnDraw();
            enableMembersAddActions();
        }, "json");

        return false;
    });

    $(".simple_search_form .search", dialog).click(function() {
        var params = $(".simple_search_form", dialog).serializeObject();
        params.members_only = true;

        $.get(action("subjects_search"), params, function(response) {
            oMembersSearch.fnClearTable();
            oMembersSearch.fnAddData(response.data);

            // let's draw again so we can filter based on added classes
            oMembersSearch.fnDraw();
            enableMembersAddActions();
        }, "json");

        return false;
    });

    $(".advanced_search_form .clear", dialog).click(function() {
        $(".advanced_search_form input, " +
          ".advanced_search_form select", dialog).val("");
        return false;
    });

    $(".simple_search a", dialog).click(function() {
        $(".simple_search input", dialog).val("");
        $(".simple_search", dialog).hide();
        $(".advanced_search", dialog).show();
    });

    $(".advanced_search a", dialog).click(function() {
        $(".advanced_search .clear", dialog).click();
        $(".advanced_search", dialog).hide();
        $(".simple_search", dialog).show();
    }).click();
}

function initGroupsTable() {
    var opts = defaultOpts();
    opts.sScrollY = "250px";
    opts.bScrollCollapse = true;
    opts.bPaginate = false;
    opts.sDom = "<'dataTables_header'f<'clearer'>>t";
    opts.aoColumns = [
        { "mData": "code" },
        { "mData": "description" },
        { "mData": "member_count" },
        { "mData": "updated" }
    ];

    oGroups = $("#groups").dataTable(opts);

    $("#groups tbody tr").live("click", function() {
        oGroups.setFocus(0, this);
        enableGroupsActions();
    });
}

function initGroupMembersTable() {
    var opts = defaultOpts();
    opts.sScrollY = "250px";
    opts.bScrollCollapse = true;
    opts.bPaginate = false;
    opts.sDom = "<'dataTables_header'f>t";
    opts.aoColumns = [
        { "mData": "name" },
        { "mData": "code" },
        { "mData": "class" },
        { "mData": "subsystem" },
        { "mData": "sdsb" },
        { "mData": "type" },
        { "mData": "added" }
    ];

    oGroupMembers = $("#group_members").dataTable(opts);

    $("#group_members_actions")
        .appendTo("#group_members_wrapper .dataTables_header");

    $("#group_members_actions .select_all").change(function() {
        var select = $(this).attr("checked");

        oGroupMembers.$('tr', {"filter": "applied"}).each(function(idx, val) {
            if (select) {
                $(val).addClass("row_selected");
            } else {
                $(val).removeClass("row_selected");
            }
        });

        enableGroupMembersActions();
    });

    $("#group_members tbody tr").live("click", function() {
        oGroupMembers.setFocus(0, this, true);
        enableGroupMembersActions();

        if (!$(this).hasClass(".row_selected")) {
            $("#group_members_actions .select_all").removeAttr("checked");
        }
    });

    var dialog = $("#group_details_dialog");

    $(".simple_search a", dialog).click(function() {
        $("#group_members_filter", dialog).hide();
        $(".simple_search", dialog).hide();
        $(".advanced_search", dialog).show();
    });

    $(".advanced_search a", dialog).click(function() {
        $(".advanced_search .clear", dialog).click();
        $(".advanced_search", dialog).hide();
        $(".simple_search", dialog).show();
        $("#group_members_filter", dialog).show();
    }).click();

    $(".advanced_search input", dialog).keyup(function () {
        oGroupMembers.fnFilter(this.value, $(".advanced_search input, " +
            ".advanced_search select", dialog).index(this));
    });

    $(".advanced_search select", dialog).change(function () {
        oGroupMembers.fnFilter($(this).val(), $(".advanced_search input, " +
            ".advanced_search select").index(this));
    });

    $(".advanced_search .clear", dialog).click(function() {
        $(".advanced_search input, .advanced_search select", dialog).val("");
        oGroupMembers.fnFilterClear();
        return false;
    });
}

function initMembersSearchTable() {
    var opts = defaultOpts();
    opts.sScrollY = "250px";
    opts.bScrollCollapse = true;
    opts.bPaginate = false;
    opts.sDom = "<'dataTables_header'<'clearer'>>t";
    opts.aoColumns = [
        { "mData": "name_description" },
        { "mData": "member_group_code" },
        { "mData": "member_class" },
        { "mData": "subsystem_code" },
        { "mData": "sdsb" },
        { "mData": "type" }
    ];
    opts.fnRowCallback = function(nRow, oData) {
        var unselectable = false;

        $.each(oGroupMembers.fnGetData(), function(idx, val) {
            if (val.sdsb == oData.sdsb &&
                val.type == oData.type &&
                val.class == oData.member_class &&
                val.code == oData.member_group_code &&
                val.subsystem == oData.subsystem_code) {

                unselectable = true;
                return false;
            }
        });

        if (unselectable) {
            $(nRow).addClass("unselectable");
        } else {
            $(nRow).addClass("selectable");
        }

        return nRow;
    };

    oMembersSearch = $("#members_search").dataTable(opts);

    $("#members_search_actions")
        .prependTo("#members_search_wrapper .dataTables_header");

    $("#members_search_actions .select_all").change(function() {
        var select = $(this).attr("checked");

        oMembersSearch.$("tr.selectable").each(function(idx, val) {
            if (select) {
                $(val).addClass("row_selected");
            } else {
                $(val).removeClass("row_selected");
            }
        });

        enableMembersAddActions();
    });

    $("#members_search_actions .show_existing").change(function() {
        oMembersSearch.fnDraw();
    });

    $("#members_search tbody .selectable").live("click", function() {
        oMembersSearch.setFocus(0, this, true);
        enableMembersAddActions();

        if (!$(this).hasClass(".row_selected")) {
            $("#members_search_actions .select_all").removeAttr("checked");
        }
    });
}

$(document).ready(function() {
    initGroupsTable();
    initGroupMembersTable();
    initMembersSearchTable();

    initClientGroupsDialog();
    initGroupAddDialog();
    initGroupDetailsDialog();
    initGroupDescriptionEditDialog();
    initGroupMembersAddDialog();
});