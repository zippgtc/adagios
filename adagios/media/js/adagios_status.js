
window.adagios = window.adagios || {};
adagios.status = adagios.status || {};
adagios.objectbrowser = adagios.objectbrowser || {};





adagios.objectbrowser.CheckCommandEditor = function(parameters) {
    p = parameters || {};
    self = {};
    self.host_name = p.host_name || $('#check_command_editor_host_name').text();
    self.service_description = p.service_description || $('#check_command_editor_service_description').text();
    self.check_command = p.check_command || $('#check_command_editor_check_command').text();
    self.working_div_id = "#check_command_editor";

    // Create the dom structure we need for this script to run
    self.create_dom = function(destination_div) {
        destination_div = destination_div || self.working_div_id;
        var html = '' +
            '<table class="" >' +
            '  <tbody id="check_command_argument_table"></tbody>' +
            '  <tbody id="service_macros_table"></tbody>' +
            '  <tbody id="other_attributes_table"></tbody>' +
            '</table>' +
            '<pre id="command_line_preview">Loading...</pre>' +
            '<pre  id="original_command_line"></pre>' +
            '';
        $(destination_div).html(html);
    }
    // Go through all the relevant input values, and return respective macros
    self.get_all_attributes = function() {
        var my_data = {};
        my_data.host_name = self.host_name;
        my_data.service_description = self.service_description;
        my_data.check_command = self.check_command;
        $(".check_command_parameter").each( function() {
            var item = $(this)[0];
            my_data[item.name] = item.value;
        });
        return my_data;
    };
    // Find the selected attributes, and read through all arguments,
    // and concat it in one field that looks like this:
    // check_command!$ARG1$!$ARG2$
    self.update_check_command_entry = function() {
        var all_attributes =self.get_all_attributes();
        check_command = all_attributes.check_command || '';
        for (i in all_attributes) {
            if (i.substring(0,4) == '$ARG') {
               check_command = check_command + '!' + all_attributes[i];
            }
        }
        if (self.check_command == '') {
            check_command = '';
        }
        $('#check_command_actual_entry').attr('value', check_command);
    }
    // This function will look up what macros are related to our check_command
    // and then create correct input boxes for each one.
    self.generate_input_fields = function() {
        my_data = {
            'host_name': self.host_name,
            'service_description': self.service_description,
            'check_command': self.check_command
        };
        $('#check_command_editor_tables').hide();

        if (my_data.check_command == null || my_data.check_command == '')
        {
            console.log("No check_command specified. Not generating any input fields");
            return;
        }
        else {
            console.log("check_command = " + my_data.check_command);

        }
        if (my_data.host_name == null || my_data.host_name == '') {
            console.log("No host_name specified. Not generating any input fields");
            $('#check_command_editor_tables').hide();
            return;
        }

        $('#check_command_editor_tables').show();

        adagios.rest.pynag.check_command(my_data)
            .done( function(data) {
                // Generate a table, where each row has an input field with
                // a macroname for us
                service_macros_input_fields = '';
                check_command_arguments_input_fields = '';
                other_input_fields = '';
                for (var i in data) {
                    // Create a human friendly label for our attribute
                    friendly_name = i.replace('$_SERVICE','');
                    friendly_name = friendly_name.replace('$ARG','Argument ');
                    friendly_name = friendly_name.split('_').join(' ').split('$').join('');
                    console.log(friendly_name);
                    // Create an edit field for this attribute
                    edit_field = '' +
                        '<tr><td>' + friendly_name + '</td>' +

                        '<td><input class="check_command_parameter";" type="text" class="span11" name="' + i + '" value="' + data[i] + '">' +
                        '</td></tr>'
                    ;
                    /* Alternative implementation
                     '<div class="control-group">' +
                     '    <label class="control-label" >' +
                     '    ' + friendly_name +
                     '    </label>' +
                     '    <div class="controls">' +
                     '<input class="check_command_parameter";" type="text" class="span11" name="' + i + '" value="' + data[i] + '">' +
                     '    </div>' +
                     '</div>' +
                     '';
                     */
                    if (i.substring(0,9) == '$_SERVICE') {
                        service_macros_input_fields += edit_field;
                    }
                    else if (i.substring(0,4) == '$ARG') {
                        check_command_arguments_input_fields += edit_field ;
                    }
                    else if (i[0] == '$') {
                        other_input_fields += edit_field;
                    }
                    else if (i == "original_command_line") {
                        $('#original_command_line').html( data[i] );
                    }
                }


                $('#service_macros_table').html(service_macros_input_fields);
                $('#other_attributes_table').html(other_input_fields);
                $('#check_command_argument_table').html(check_command_arguments_input_fields);


                // The other input fields are not related to our specific service, and no need
                // To make them editable
                $('#other_attributes_table input').prop('disabled', true);

                // Preview the command line
                self.original_command_line = data.original_command_line;
                self.decorate_original_command_line();
                self.display_effective_command_line();

                // Our newly generated fields will get a keyup event so preview is updated when
                // field is changed.
                $('.check_command_parameter').keyup( function() {
                    self.decorate_original_command_line();
                    self.display_effective_command_line();
                    self.update_check_command_entry();
                });
                self.update_check_command_entry();
            })
            .fail( function(data) {
                self.error(data);
            });
    };

    // Lets resolve all macros and put the result in #command_line_preview
    self.display_effective_command_line = function() {
        var macros = self.get_all_attributes();
        macronames = self.original_command_line.match(/\$.*?\$/g);
        effective_command_line = self.original_command_line;
        for (var i in macronames) {
            macroname = macronames[i];
            macrovalue = macros[macroname];
            effective_command_line = effective_command_line.replace(macroname,macrovalue);
        }
        $('#command_line_preview').html( effective_command_line );

    };

    // We have a div that contains the original command-line with all its macros.
    // Lets modify it so all macros are highlighted.
    // If it so happens that decorated command line is the same as effective one
    // Then we will hide this dialog
    self.decorate_original_command_line = function() {
        var data = self.get_all_attributes();
        macronames = self.original_command_line.match(/\$.*?\$/g);
        decorated_command_line =  self.original_command_line;
        for (var i in macronames) {
            macroname = macronames[i];
            macrovalue = data[macroname];
            new_str = "<a "
                + "class='macro_in_a_text' title='value="
                + macrovalue
                + "'>"
                + macroname
                + "</a>";
            decorated_command_line = decorated_command_line.replace(macroname,new_str);
        }
        $('#original_command_line').html( decorated_command_line );
    }

    // Read through all inputs in #input_fields and then save the current service
    // This function reloads the current page on success
    self.save_check_command = function() {
        my_data = self.get_all_attributes();

        adagios.rest.status.update_check_command(my_data)
            .done( function(data) {
                location.reload();
            })
            .fail( function(data) {
                self.error('Failed to run save_check_command()');
            });
        $('#check_command_save_button').button('loading');


    };

    self.error = function(message) {
        message = message || 'no error message provided';
        console.error('error: ' + message);
    };

    self.debug = function(message) {
        self.debug = self.debug || false;
        if (self.debug) {
            console.log("debug: " + message);
        }
    }

    return self;
};

