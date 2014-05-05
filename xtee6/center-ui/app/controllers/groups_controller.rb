class GroupsController < ApplicationController
  include BaseHelper

  def index
    authorize!(:view_global_groups)
  end

  def global_groups_refresh
    authorize!(:view_global_groups)

    searchable = params[:sSearch]

    query_params = get_list_query_params(
      get_group_list_column(get_sort_column_no))

    groups = GlobalGroup.get_groups(query_params)
    count = GlobalGroup.get_group_count(searchable)

    result = []
    groups.each do |each|
      member_count = each.member_count ? each.member_count : 0

      result << {
        :id => each.id,
        :code => each.group_code,
        :member_count => member_count,
        :description => each.description,
        :updated => format_time(each.updated_at.localtime)
      }
    end
    render_data_table(result, count, params[:sEcho])
  end

  def group_add
    authorize!(:add_global_group)

    code = params[:code]
    description = params[:description]

    GlobalGroup.add_group(code, description)
    render_json({})
  end

  def group_members
    authorize!(:view_global_groups)

    # XXX: Solution is quite inefficient as lot of database queries are done.
    searchable = params[:sSearch]

    advanced_search_params =
        get_advanced_search_params(params[:advancedSearchParams])

    query_params = get_list_query_params(
      get_group_members_column(get_sort_column_no))

    searchable = advanced_search_params if advanced_search_params
    group_id = params[:groupId]

    group_members = GlobalGroupMember.
        get_group_members(group_id, query_params, advanced_search_params)
    count = GlobalGroupMember.get_group_member_count(group_id, searchable)

    result = []
    group_members.each do |each|
      member_id = each.group_member
      member_class = member_id.member_class
      member_code = member_id.member_code

      result << {
        :name => SdsbMember.find_by_code(member_class, member_code).name,
        :member_code => member_code,
        :member_class => member_class,
        :subsystem => member_id.subsystem_code,
        :sdsb => member_id.sdsb_instance,
        :type => member_id.object_type,
        :added => format_time(member_id.created_at.localtime)
      }
    end

    render_data_table(result, count, params[:sEcho])
  end

  def group_edit_description
    authorize!(:edit_group_description)

    GlobalGroup.update_description(params[:groupId], params[:description])

    notice(t("groups.change_description"));
    render_json();
  end

  def delete_group
    authorize!(:delete_group)

    GlobalGroup.destroy(params[:groupId])

    notice(t("groups.delete"));
    render_json();
  end

  def remove_selected_members
    authorize!(:add_and_remove_group_members)

    raw_member_ids = params[:removableMemberIds].values
    group = GlobalGroup.find(params[:groupId])

    raw_member_ids.each do |each|
      member_id = ClientId.from_parts(
          each[:sdsbInstance],
          each[:memberClass],
          each[:memberCode],
          each[:subsystemCode]
      )

      logger.debug(
          "Removing member '#{member_id}' from global group '#{group.inspect}'")
      group.remove_member(member_id);
    end

    notice(t("groups.delete_selected_members"));
    render_json();
  end

  def addable_members
    authorize!(:view_group_details)

    s_echo = params[:sEcho]

    if params[:skipFillTable] == "true"
      render_data_table([], 0, s_echo)
      return
    end

    searchable = params[:sSearch]

    advanced_search_params =
        get_advanced_search_params(params[:advancedSearchParams])

    query_params = get_list_query_params(
        get_addable_members_column(get_sort_column_no))

    searchable = advanced_search_params if advanced_search_params

    show_members = params[:showMembersInSearchResult] == "true"
    group_id = params[:groupId]
    group = GlobalGroup.find(group_id)

    member_infos = show_members ?
        SecurityServerClient.get_clients(query_params, advanced_search_params):
        SecurityServerClient.get_remaining_clients_for_group(group_id,
            query_params, advanced_search_params)

    count = show_members ?
        SecurityServerClient.get_clients_count(searchable):
        SecurityServerClient.get_remaining_clients_count(group_id, searchable)

    result = []
    member_infos.each do |each|
      client_id = each[:identifier]
      belongs_to_group = show_members ? group.has_member?(client_id) : false

      result << {
        :name => each[:name],
        :member_code => client_id.member_code,
        :member_class => client_id.member_class,
        :subsystem => client_id.subsystem_code,
        :sdsb => client_id.sdsb_instance,
        :type => client_id.object_type,
        :belongs_to_group => belongs_to_group
      }
    end

    render_data_table(result, count, s_echo)
  end

  def add_members_to_group
    authorize!(:add_and_remove_group_members)

    selected_members = params[:selectedMembers].values
    group = GlobalGroup.find(params[:groupId])

    selected_members.each do |each|
      new_member_id = ClientId.from_parts(
          each[:sdsb],
          each[:member_class],
          each[:member_code],
          each[:subsystem]
      )
      group.add_member(new_member_id)
    end

    render_json()
  end

  def sdsb_instance_codes
    authorize!(:view_global_groups)

    distinct_instances = ClientId.select('DISTINCT sdsb_instance')

    instance_codes = []
    distinct_instances.each do |each|
      instance_code = each.sdsb_instance

      if instance_code && !instance_code.empty?
        instance_codes << instance_code
      end
    end

    render_json(instance_codes)
  end

  def types
    authorize!(:view_global_groups)

    distinct_types = ClientId.select('DISTINCT object_type')

    types = []
    distinct_types.each do |each|
      type = each.object_type

      if type && !type.empty?
        types << type
      end
    end

    render_json(types)
  end

  def can_see_details
    render_details_visibility(:view_group_details)
  end

  def get_member_count
    member_count = GlobalGroup.get_member_count(params[:groupId])
    render_json({:member_count => member_count})
  end

  def find_by_id
    group = GlobalGroup.find(params[:groupId])
    group_as_json = {
      :id => group.id,
      :code => group.group_code,
      :description => group.description,
    }

    render_json(group_as_json)
  end
  # Number of GlobalGroup objects in the database
  def get_records_count
    render_json(:count => GlobalGroup.count)
  end

  private

  def get_group_list_column(index)
    case index
    when 0
      return 'group_code'
    when 1
      return 'description'
    when 2
      return 'member_count'
    when 3
      return 'created_at'
    else
      raise "Index '#{index}' has no corresponding column."
    end
  end

  def get_group_members_column(index)
    case index
    when 0
      return 'security_server_client_names.name'
    when 1
      return 'identifiers.member_code'
    when 2
      return 'identifiers.member_class'
    when 3
      return 'identifiers.subsystem_code'
    when 4
      return 'identifiers.sdsb_instance'
    when 5
      return 'identifiers.object_type'
    when 6
      return 'identifiers.created_at'
    else
      raise "Index '#{index}' has no corresponding column."
    end
  end

  def get_addable_members_column(index)
    case index
    when 0
      return 'security_server_client_names.name'
    when 1
      return 'identifiers.member_code'
    when 2
      return 'identifiers.member_class'
    when 3
      return 'identifiers.subsystem_code'
    else
      raise "Index '#{index}' has no corresponding column."
    end

  end
end