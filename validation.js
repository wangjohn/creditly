Validation = (function(){
  /*
   * Validator functions
   * --------------------------------------------------------------------------
   */
  var Validators = (function() {
    var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var expirationRegex = /(\d\d)\s*\/\s*(\d\d)/;
    var zipCodeRegex = /(^\d{5}$)|(^\d{5}\s*-\s*\d{4}$)/;

    var required = function(selector, data) {
      var value = $.trim($(selector).val())
      var isValid = (value !== "");
      return {
        "is_valid": isValid,
        "output_value": value,
        "message": data["message"]
      };
    };

    var zipCode = function(selector, data) {
      var value = $.trim($(selector).val());
      var isValid = zipCodeRegex.test(value);

      return {
        "is_valid": isValid,
        "message": data["message"],
        "output_value": value
      };
    };

    var noValidation = function(selector, data) {
      return {
        "is_valid": true,
        "output_value": $(selector).val()
      };
    };

    var multipleRequired = function(selector, data) {
      var invalidSelectors = []
      $(selector).each(function(index, element) {
        var isValid = ($.trim($(element).val()) !== "");
        if (!isValid) {
          invalidSelectors.push(element);
        }
      });
      var outputValue = [{
        "product_id": $.trim($(data["product_id_selector"]).val()),
        "quantity": 1
      }];

      return {
        "is_valid": (invalidSelectors.length === 0),
        "output_value": outputValue,
        "message": data["message"],
        "selectors": invalidSelectors
      };
    };

    var email = function(selector, data) {
      var email = $.trim($(selector).val());
      var isValid = false;
      if (email !== "" && emailRegex.test(email)) {
        isValid = true;
      }
      return {
        "is_valid": isValid,
        "output_value": email,
        "message": data["message"]
      };
    };

    var checkbox = function(selector, data) {
      var value = $(selector).is(":checked");
      return {
        "is_valid": true,
        "output_value": value
      };
    };

    var creditCardExpiration = function(selector, data) {
      var expirationVal = $.trim($(selector).val());
      var match = expirationRegex.exec(expirationVal);
      var isValid = false;
      var outputValue = ["", ""];
      if (match && match.length === 3) {
        var month = parseInt(match[1], 10);
        var year = "20" + match[2];
        if (month >= 0 && month <= 12) {
          isValid = true;
          var outputValue = [month, year];
        }
      }

      return {
        "is_valid": isValid,
        "message": data["message"],
        "output_value": outputValue
      };
    };

    var creditCard = function(selector) {
      var rawNumber = $(selector).find("input.credit-card-number").val();
      var number = $.trim(rawNumber).replace(/\D/g, "");
      var rawSecurityCode = $(selector).find("input.security-code").val();
      var securityCode = $.trim(rawSecurityCode).replace(/\D/g, "");
      var message, errorType;
      var isValid = false;

      if (isValidCreditCardNumber(number)) {
        if (isAmericanExpress(number)) {
          isValid = (securityCode.length == 4);
        } else {
          isValid = (securityCode.length == 3);
        }
        if (!isValid) {
          message = "Invalid security code";
        }
      } else {
        message = "Invalid credit card number";
      }

      result = {
        "is_valid": isValid,
        "output_value": [number, securityCode],
        "message": message
      };
      return result;
    };

    var isAmericanExpress = function(number) {
      return (number.length == 15);
    };

    // Luhn Algorithm.
    var isValidCreditCardNumber = function(value) {
      if (value.length === 0) return false;
      // accept only digits, dashes or spaces
      if (/[^0-9-\s]+/.test(value)) return false;

      var nCheck = 0, nDigit = 0, bEven = false;
      for (var n = value.length - 1; n >= 0; n--) {
        var cDigit = value.charAt(n);
        var nDigit = parseInt(cDigit, 10);
        if (bEven) {
          if ((nDigit *= 2) > 9) nDigit -= 9;
        }
        nCheck += nDigit;
        bEven = !bEven;
      }
      return (nCheck % 10) == 0;
    };

    var name = function(selector, data) {
      var nameVal = $.trim($(selector).val());
      var split = nameVal.split(" ");
      var outputValue = ["", ""];
      var isValid = false;
      if (split.length > 1) {
        isValid = true;
        var firstName = split.splice(0, split.length-1).join(" ");
        var lastName = split[split.length-1];
        outputValue = [firstName, lastName];
      }

      return {
        "is_valid": isValid,
        "output_value": outputValue,
        "message": data["message"]
      };
    };

    return {
      creditCard: creditCard,
      creditCardExpiration: creditCardExpiration,
      checkbox: checkbox,
      email: email,
      multipleRequired: multipleRequired,
      name: name,
      noValidation: noValidation,
      required: required,
      zipCode: zipCode
    };
  })();

  /*
   * Validation Response Holders (ErrorHolder and OutputHolder)
   * --------------------------------------------------------------------------
   */

  var ValidationErrorHolder = (function() {
    var errorMessages = [];
    var selectors = [];

    var addError = function(selector, validatorResults) {
      if (validatorResults.hasOwnProperty("selectors")) {
        selectors = selectors.concat(validatorResults["selectors"]);
      } else {
        selectors.push(selector)
      }

      errorMessages.push(validatorResults["message"]);
    };

    var triggerErrorMessage = function() {
      var errorsPayload = {
        "selectors": selectors,
        "messages": errorMessages
      };
      $("body").trigger("zinc_client_validation_error", errorsPayload);
    };

    return {
      addError: addError,
      triggerErrorMessage: triggerErrorMessage
    };
  });

  var ValidationOutputHolder = (function() {
    var output = {};

    var addOutput = function(outputName, value) {
      var outputParts = outputName.split(".");
      var currentPart = output;
      for (var i=0; i<outputParts.length; i++) {
        if (!currentPart.hasOwnProperty(outputParts[i])) {
          currentPart[outputParts[i]] = {};
        }

        // Either place the value into the output, or continue going down the
        // search space.
        if (i === outputParts.length-1) {
          currentPart[outputParts[i]] = value
        } else {
          currentPart = currentPart[outputParts[i]];
        }
      }
    };

    var getOutput = function() {
      return output;
    };

    return {
      addOutput: addOutput,
      getOutput: getOutput
    }
  });

  var processSelector = function(selector, selectorValidatorMap, errorHolder, outputHolder) {
    if (selectorValidatorMap.hasOwnProperty(selector)) {
      var currentMapping = selectorValidatorMap[selector];
      var validatorType = currentMapping["type"];
      var fieldName = currentMapping["name"];
      var validatorResults = Validators[validatorType](selector, currentMapping["data"]);

      if (validatorResults["is_valid"]) {
        if (currentMapping["output_name"] instanceof Array) {
          for (var i=0; i<currentMapping["output_name"].length; i++) {
            outputHolder.addOutput(currentMapping["output_name"][i],
                validatorResults["output_value"][i]);
          }
        } else {
          outputHolder.addOutput(currentMapping["output_name"],
              validatorResults["output_value"]);
        }
      } else {
        errorHolder.addError(selector, validatorResults);
        return true;
      }
    }
  };

  var validate = function(selectorValidatorMap) {
    var errorHolder = ValidationErrorHolder();
    var outputHolder = ValidationOutputHolder();
    var anyErrors = false;
    for (var selector in selectorValidatorMap) {
      if (processSelector(selector, selectorValidatorMap, errorHolder, outputHolder)) {
        anyErrors = true;
      }
    }
    if (anyErrors) {
      errorHolder.triggerErrorMessage();
      return false;
    } else {
      return outputHolder.getOutput();
    }
  };

  /**
   * Validation code and selectors
   * --------------------------------------------------------------------------
   */

  var validateStoreCardForm = function() {
    var selectorValidatorTypeMap = {
      "section.credit-card .number": {
        "type": "creditCard",
        "output_name": ["store_card.number", "review_order.payment_method.security_code"]
      },
      "section.credit-card .expiration-month-and-year": {
        "type": "creditCardExpiration",
        "data": {
          "message": "Invalid credit card expiration date"
        },
        "output_name": ["store_card.expiration_month", "store_card.expiration_year"]
      },
    };

    return validate(selectorValidatorTypeMap);
  };

  return {
    validate: validate,
    validateStoreCardForm: validateStoreCardForm
  };
})();
