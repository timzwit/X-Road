module ValidationHelper

  class ValidationError < RuntimeError; end

  private

  DEFAULT_VALIDATORS = {
    :action => [],
    :controller => [],
    :authenticity_token => [],
    :utf8 => [],
    :ignore => []
  }

  def strip_params
    params.each do |key, val|
      if val.respond_to?(:strip)
        params[key] = val.strip
      elsif val.is_a?(Array)
        params[key] = val.collect { |i| i.strip }
      end
    end
  end

  def validate_params(param_validators = {})
    param_validators.merge!(DEFAULT_VALIDATORS)

    check_existence(param_validators, params)
    run_validators(param_validators, params)
  end

  def check_existence(param_validators, params)
    param_validators.each do |param, validators|
      if validators.is_a?(Hash)
        params = (params && params[param].is_a?(Hash)) ? params[param] : nil
        check_existence(validators, params)
        return
      end

      validators.each do |validator|
        if validator.is_a?(RequiredValidator) && (!params || !params[param] ||
             (params[param].is_a?(String) && params[param].length == 0))
          raise t('validation.missing_param', :param => param)
        end
      end
    end
  end

  def run_validators(params_validators, params)
    params.each do |param, value|
      unless params_validators.is_a?(Hash) &&
          validators = params_validators[param.to_sym]
        raise t('validation.unexpected_param', :param => param)
      end

      if value.is_a?(Hash)
        run_validators(validators, value)
      else
        values = value.is_a?(Array) ? value : [value]
        values.each do |value|
          validators.each do |validator|
            validator.validate(value, param)
          end
        end
      end
    end
  end

  class Validator
    def validate(val, param)
    end
  end

  class RequiredValidator < Validator
    def validate(val, param)
      if !param || !val || (val.is_a?(String) && val.empty?)
        raise I18n.t('validation.missing_param', :param => param)
      end
    end
  end

  class EmailAddressValidator < Validator
    def validate(val, param)
      # XXX: Is it sufficient behavior everywhere?
      return if !val || val.empty?

      emailValid = val =~ /\A([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})\Z/
      unless emailValid
        raise I18n.t("validation.invalid_email", :addr => val)
      end
    end
  end

  class FilenameValidator < Validator
    def validate(val, param)
      m = val.match('^[a-z0-9]*$')
      unless m
        raise I18n.t("validation.invalid_filename", :val => val)
      end
    end
  end
end