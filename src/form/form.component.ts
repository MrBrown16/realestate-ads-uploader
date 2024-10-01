import { Component } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class FormComponent {
  adForm: FormGroup;
  formFields: any[] = [];
  websites = ['website1.com', 'website2.com', 'website3.com'];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.adForm = this.fb.group({
      website: new FormControl(''),
      adType: new FormControl(''),
      dynamicFields: this.fb.group({})
    });
  }

  loadFormFields() {
    const selectedWebsite = this.adForm.get('website')?.value;
    const adType = this.adForm.get('adType')?.value;

    if (selectedWebsite && adType) {
      this.http.get(`/api/form-fields?website=${selectedWebsite}&adType=${adType}`)
        .subscribe((fields: any) => {
          this.formFields = fields;
          this.addDynamicFormControls(fields);
        });
    }
  }

  addDynamicFormControls(fields: any[]) {
    const dynamicFields = this.adForm.get('dynamicFields') as FormGroup;
    dynamicFields.reset();

    fields.forEach(field => {
      dynamicFields.addControl(field.name, new FormControl(''));
    });
  }

  onSubmit() {
    console.log(this.adForm.value);
  }
}
