login

visit form url

(1) map whole current form 
(2)    start to record current form in formData format until first fork-creating field if no such field is found record fields and terminate current fork mapping
(3)    visit first fork with options.length>1 (get options from fieldStore) 
(4)        for each option: map form from current fork-creating field until the next field having options.length>1
(5)        record all unique forks with option values mapped to them including the next field having options.length>1 that terminated (4)
(6)        for each fork: current form = all non mapped/remaining fields + last field that terminated (4)
(7)             (1) 