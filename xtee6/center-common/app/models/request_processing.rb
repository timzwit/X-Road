class RequestProcessing < ActiveRecord::Base
  # Processing has been created but not associated with any requests.
  NEW = "NEW"
  # Processing has one request and is waiting for second.
  WAITING = "WAITING"
  # Processing has two requests and is executing the task.
  EXECUTING = "EXECUTING"
  # Processing is approved.
  APPROVED = "APPROVED"
  # Processing is canceled.
  CANCELED = "CANCELED"


  has_many :requests,
      :class_name => "RequestWithProcessing",
      :inverse_of => :request_processing,
      :limit => 2

  def initialize()
    super(:status => NEW)
  end

  # Takes as argument a list of requests that matches search criteria for
  # given processing.
  # If there are no requests, returns null.
  # If there is exactly one request, returns processing associated with
  # this request.
  # If there are more requests, throws exception (there should be only one
  # open processing matching the search criteria)
  def self.processing_from_requests(requests)
    if requests.empty?
      # No pending processings.
      nil
    elsif requests.length == 1
      # We have exactly one pending request. Let's use it.
      requests.first.request_processing
    else
      # We have several processings open at the same time. This is error.
      raise I18n.t("requests.multiple_open_requests",
          :server_id => requests.first.security_server.to_s)
    end
  end

  # Adds given request to this processing.
  def add_request(request)
    puts("add_request(#{request}), status = #{status}")
    if status == NEW # Newly created processing
      # Attach request to processing
      connect_to(request)
      self.status = WAITING
    elsif status == WAITING # We were waiting for second request.
      compare_request_data(self.single_request, request)

      # Attach new request to processing.
      connect_to(request)
      self.status = EXECUTING
      # Determine the request that came from the security server.
      from_server = requests.find {|req| req.origin == Request::SECURITY_SERVER}
      execute(from_server)
      self.status = APPROVED
    else # not waiting for requests
      raise I18n.t("requests.invalid_processing_state",
          :status => status)
    end

    save!
  end

  def compare_request_data(first, second)
    # If we have two requests from the same origin, this is an error.
    if first.origin == second.origin
      raise I18n.t("requests.duplicate_requests",
          :user => first.sec_serv_user,
          :security_server => first.security_server,
          :received => format_time(first.created_at),
          :id => first.id)
    end
  end

  # Performs the task associated with this request.
  # The parameter is the request that was received from security server.
  def execute(request_from_server)
    throw "This method must be reimplemented in a subclass"
  end

  # Returns the only request associated with this processing
  def single_request
    if requests.empty?
      nil
    elsif requests.size == 1
      requests[0]
    else
      raise I18n.t("requests.more_than_one_requests")
    end
  end

  def connect_to(request)
    request.request_processing = self
    self.requests << request
  end

  # Takes as input a request and returns the other request associated
  # with this processing. Returns null, if this processing only has one
  # request.
  # Note: assumes that the argument request is saved in database.
  def get_other_request(request)
    requests.find {|req| req.id != request.id}
  end

  # TODO Duplication with common-ui/helpers/base_helper
  def format_time(time)
    time.to_i == 0 ? "&mdash;" : time.strftime(I18n.t('common.time_format'))
  end
end